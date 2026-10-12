import AVFoundation
import ImageIO
import UIKit

private struct CameraFailure: LocalizedError {
  let message: String
  var errorDescription: String? { message }
}

final class ManualCameraController: UIViewController, AVCapturePhotoCaptureDelegate {
  var onFinish: (([String: Any]?, Error?) -> Void)?
  private let session = AVCaptureSession()
  private let output = AVCapturePhotoOutput()
  private let sessionQueue = DispatchQueue(label: "zine.raw.session")
  private let renderQueue = DispatchQueue(label: "zine.raw.render", qos: .userInitiated)
  private var device: AVCaptureDevice?
  private var photoData: Data?
  private var captureError: Error?
  private var captureISO: Float = 0
  private var captureSeconds: Double = 0
  private var stopped = false // sessionQueue only
  private var captureActive = false // sessionQueue only
  private var hasStarted = false
  private var ended = false // main queue only
  private var observers: [NSObjectProtocol] = []
  private var meterTimer: Timer?
  private var preview: AVCaptureVideoPreviewLayer!
  private let previewView = UIView()
  private let isoSlider = UISlider()
  private let shutterSlider = UISlider()
  private let isoLabel = UILabel()
  private let shutterLabel = UILabel()
  private let meterLabel = UILabel()
  private let statusLabel = UILabel()
  private let captureButton = UIButton(type: .system)
  private let cancelButton = UIButton(type: .system)

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.05, green: 0.06, blue: 0.06, alpha: 1)
    let title = UILabel()
    title.text = "little zine / CAMERA"
    title.font = .systemFont(ofSize: 23, weight: .semibold)
    title.textColor = .white
    cancelButton.setTitle("Cancel", for: .normal)
    cancelButton.addTarget(self, action: #selector(cancel), for: .touchUpInside)
    let header = UIStackView(arrangedSubviews: [title, cancelButton])
    header.distribution = .equalSpacing
    previewView.backgroundColor = .black
    previewView.clipsToBounds = true
    preview = AVCaptureVideoPreviewLayer(session: session)
    preview.videoGravity = .resizeAspect
    previewView.layer.addSublayer(preview)
    statusLabel.text = "Opening the rear wide camera…"
    statusLabel.numberOfLines = 0
    meterLabel.numberOfLines = 0
    meterLabel.text = "Live view is a processed framing preview, not the RAW result."
    for label in [isoLabel, shutterLabel, meterLabel, statusLabel] {
      label.textColor = UIColor(white: 0.8, alpha: 1)
      label.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
    }
    for slider in [isoSlider, shutterSlider] {
      slider.isEnabled = false
      slider.tintColor = UIColor(red: 0.73, green: 0.38, blue: 0.25, alpha: 1)
      slider.addTarget(self, action: #selector(exposureChanged), for: .valueChanged)
    }
    isoSlider.accessibilityLabel = "Sensor ISO"
    shutterSlider.accessibilityLabel = "Shutter duration"
    captureButton.setTitle("Capture photo", for: .normal)
    captureButton.titleLabel?.font = .systemFont(ofSize: 18, weight: .semibold)
    captureButton.backgroundColor = UIColor(white: 0.9, alpha: 1)
    captureButton.setTitleColor(.black, for: .normal)
    captureButton.layer.cornerRadius = 5
    captureButton.isEnabled = false
    captureButton.addTarget(self, action: #selector(capture), for: .touchUpInside)
    let stack = UIStackView(arrangedSubviews: [header, previewView, statusLabel, isoLabel, isoSlider, shutterLabel, shutterSlider, meterLabel, captureButton])
    stack.axis = .vertical
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20),
      stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
      stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
      stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
      previewView.heightAnchor.constraint(greaterThanOrEqualToConstant: 100),
      captureButton.heightAnchor.constraint(equalToConstant: 54)
    ])
    previewView.setContentHuggingPriority(.defaultLow, for: .vertical)
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
      self?.finish(nil, nil)
    })
    observers.append(NotificationCenter.default.addObserver(forName: .AVCaptureSessionRuntimeError, object: session, queue: .main) { [weak self] _ in
      self?.finish(nil, CameraFailure(message: "The camera session stopped. Open the camera again."))
    })
    observers.append(NotificationCenter.default.addObserver(forName: .AVCaptureSessionWasInterrupted, object: session, queue: .main) { [weak self] _ in
      self?.finish(nil, CameraFailure(message: "Camera access was interrupted. Open the camera again."))
    })
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    guard !hasStarted, !ended else { return }
    hasStarted = true
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: configure()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        if granted { self?.configure() }
        else { DispatchQueue.main.async { self?.finish(nil, CameraFailure(message: "Camera permission is needed. Enable it in iPhone Settings.")) } }
      }
    default: finish(nil, CameraFailure(message: "Camera permission is denied. Enable it in iPhone Settings."))
    }
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    preview.frame = previewView.bounds
  }

  private func configure() {
    sessionQueue.async { [weak self] in
      guard let self = self, !self.stopped else { return }
      do {
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
          throw CameraFailure(message: "A rear wide camera is required. Photo capture cannot run in a simulator.")
        }
        guard camera.isExposureModeSupported(.custom) else {
          throw CameraFailure(message: "This camera does not support manual sensor exposure.")
        }
        self.session.beginConfiguration()
        self.session.sessionPreset = .photo
        let input = try AVCaptureDeviceInput(device: camera)
        guard self.session.canAddInput(input), self.session.canAddOutput(self.output) else {
          self.session.commitConfiguration()
          throw CameraFailure(message: "The photo capture session could not be configured.")
        }
        self.session.addInput(input)
        self.session.addOutput(self.output)
        self.output.maxPhotoQualityPrioritization = .speed
        // This capture path does not require RAW hardware support.
        if self.output.isAppleProRAWSupported { self.output.isAppleProRAWEnabled = false }
        self.session.commitConfiguration()
        try camera.lockForConfiguration()
        camera.videoZoomFactor = 1
        if camera.isFocusModeSupported(.continuousAutoFocus) { camera.focusMode = .continuousAutoFocus }
        if camera.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) { camera.whiteBalanceMode = .continuousAutoWhiteBalance }
        camera.unlockForConfiguration()
        self.device = camera
        self.session.startRunning()
        guard self.output.availablePhotoCodecTypes.contains(.jpeg) else {
          throw CameraFailure(message: "This camera does not support JPEG photo capture.")
        }
        if let connection = self.output.connection(with: .video) {
          if connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
          connection.videoScaleAndCropFactor = 1
        }
        DispatchQueue.main.async {
          guard !self.ended else { return }
          if let connection = self.preview.connection, connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
          self.isoSlider.minimumValue = log2(camera.activeFormat.minISO)
          self.isoSlider.maximumValue = log2(camera.activeFormat.maxISO)
          self.isoSlider.value = self.isoSlider.minimumValue
          let minimum = max(camera.activeFormat.minExposureDuration.seconds, 1.0 / 8000)
          let maximum = max(minimum, min(camera.activeFormat.maxExposureDuration.seconds, 0.25))
          self.shutterSlider.minimumValue = Float(log2(minimum))
          self.shutterSlider.maximumValue = Float(log2(maximum))
          self.shutterSlider.value = Float(log2(min(max(1.0 / 125, minimum), maximum)))
          self.isoSlider.isEnabled = true
          self.shutterSlider.isEnabled = true
          self.captureButton.isEnabled = true
          self.statusLabel.text = "MANUAL PHOTO · 1× WIDE · MINIMUM ISO DEFAULT\nStart at minimum ISO. Adjust shutter to protect highlights."
          self.exposureChanged()
          self.meterTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.sessionQueue.async { [weak self] in
              guard let self = self, let device = self.device else { return }
              let offset = device.exposureTargetOffset
              DispatchQueue.main.async {
                self.meterLabel.text = String(format: "Meter %+.1f EV versus camera target\nJPEG still uses Apple’s image pipeline. No app filter is added.", offset)
              }
            }
          }
        }
      } catch {
        DispatchQueue.main.async { self.finish(nil, error) }
      }
    }
  }

  private func values() -> (Float, Double) { (pow(2, isoSlider.value), pow(2, Double(shutterSlider.value))) }

  @objc private func exposureChanged() {
    let (iso, seconds) = values()
    isoLabel.text = String(format: "ISO %.0f", iso)
    shutterLabel.text = seconds < 1 ? String(format: "SHUTTER 1/%.0f s", 1 / seconds) : String(format: "SHUTTER %.2f s", seconds)
    sessionQueue.async { [weak self] in
      guard let self = self, let camera = self.device, !self.captureActive else { return }
      do {
        try camera.lockForConfiguration()
        camera.setExposureModeCustom(duration: CMTimeMinimum(CMTimeMaximum(CMTime(seconds: seconds, preferredTimescale: 1_000_000_000), camera.activeFormat.minExposureDuration), camera.activeFormat.maxExposureDuration), iso: min(max(iso, camera.activeFormat.minISO), camera.activeFormat.maxISO), completionHandler: nil)
        camera.unlockForConfiguration()
      } catch { DispatchQueue.main.async { self.statusLabel.text = "Exposure could not be changed. Try again." } }
    }
  }

  @objc private func capture() {
    let (iso, seconds) = values()
    setControlsEnabled(false)
    statusLabel.text = "Capturing your photo…"
    sessionQueue.async { [weak self] in
      guard let self = self, let camera = self.device, !self.captureActive else { return }
      self.captureActive = true
      self.photoData = nil
      self.captureError = nil
      do {
        try camera.lockForConfiguration()
        // Wait for actual hardware exposure to settle before requesting the photo.
        camera.setExposureModeCustom(duration: CMTimeMinimum(CMTimeMaximum(CMTime(seconds: seconds, preferredTimescale: 1_000_000_000), camera.activeFormat.minExposureDuration), camera.activeFormat.maxExposureDuration), iso: min(max(iso, camera.activeFormat.minISO), camera.activeFormat.maxISO)) { [weak self] _ in
          self?.sessionQueue.async { [weak self] in
            guard let self = self, !self.stopped else { return }
            self.captureISO = camera.iso
            self.captureSeconds = camera.exposureDuration.seconds
            let settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg, AVVideoCompressionPropertiesKey: [AVVideoQualityKey: 1.0]])
            settings.photoQualityPrioritization = .speed // Prefer the faster capture path; this does not disable the ISP.
            settings.flashMode = .off
            settings.isAutoVirtualDeviceFusionEnabled = false
            settings.isAutoRedEyeReductionEnabled = false
            settings.isAutoContentAwareDistortionCorrectionEnabled = false
            self.output.capturePhoto(with: settings, delegate: self)
          }
        }
        camera.unlockForConfiguration()
      } catch { self.captureFailed(error) }
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    sessionQueue.async {
      if let error = error { self.captureError = error; return }
      guard !photo.isRawPhoto, let data = photo.fileDataRepresentation() else {
        self.captureError = CameraFailure(message: "The camera did not return a JPEG photo.")
        return
      }
      self.photoData = data
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings, error: Error?) {
    sessionQueue.async {
      if let error = error ?? self.captureError { self.captureFailed(error); return }
      guard let data = self.photoData else {
        self.captureFailed(CameraFailure(message: "The captured photo is missing.")); return
      }
      let iso = self.captureISO
      let seconds = self.captureSeconds
      self.photoData = nil
      DispatchQueue.main.async { self.statusLabel.text = "Keeping the captured JPEG without an app filter…" }
      self.renderQueue.async {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("zine-camera", isDirectory: true)
        let id = UUID().uuidString
        let photoURL = directory.appendingPathComponent(id + ".jpg")
        do {
          try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
          try data.write(to: photoURL, options: .atomic)
          guard let source = CGImageSourceCreateWithData(data as CFData, nil),
                let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any],
                let width = properties[kCGImagePropertyPixelWidth as String] as? NSNumber,
                let height = properties[kCGImagePropertyPixelHeight as String] as? NSNumber else {
            throw CameraFailure(message: "The photo dimensions could not be read.")
          }
          DispatchQueue.main.async {
            if self.ended {
              try? FileManager.default.removeItem(at: photoURL)
            } else {
              self.finish(["photoUri": photoURL.absoluteString, "iso": iso,
                           "shutterSeconds": seconds, "mode": "manual-photo",
                           "width": width.intValue, "height": height.intValue], nil)
            }
          }
        } catch {
          try? FileManager.default.removeItem(at: photoURL)
          self.sessionQueue.async { self.captureFailed(error) }
        }
      }
    }
  }

  // sessionQueue only; leave the camera open so a failed capture can be retried.
  private func captureFailed(_ error: Error) {
    captureActive = false
    photoData = nil
    DispatchQueue.main.async {
      guard !self.ended else { return }
      self.setControlsEnabled(true)
      self.statusLabel.text = error.localizedDescription
    }
  }

  private func setControlsEnabled(_ enabled: Bool) {
    captureButton.isEnabled = enabled
    isoSlider.isEnabled = enabled
    shutterSlider.isEnabled = enabled
    cancelButton.isEnabled = enabled
  }

  @objc private func cancel() { finish(nil, nil) }

  private func finish(_ result: [String: Any]?, _ error: Error?) {
    guard !ended else { return }
    ended = true
    meterTimer?.invalidate()
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    observers.removeAll()
    sessionQueue.async { self.stopped = true; if self.session.isRunning { self.session.stopRunning() } }
    onFinish?(result, error)
    onFinish = nil
  }
}
