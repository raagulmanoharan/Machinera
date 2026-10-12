import ExpoModulesCore
import UIKit

public class ZineCameraModule: Module {
  private var camera: ManualCameraController?

  public func definition() -> ModuleDefinition {
    Name("ZineCamera")
    AsyncFunction("discardCapture") { (uris: [String]) in
      let directory = FileManager.default.temporaryDirectory.appendingPathComponent("zine-camera", isDirectory: true).standardizedFileURL
      for uri in uris {
        guard let url = URL(string: uri), url.isFileURL,
              url.deletingLastPathComponent().standardizedFileURL == directory,
              ["jpg"].contains(url.pathExtension.lowercased()) else { continue }
        try? FileManager.default.removeItem(at: url)
      }
    }
    AsyncFunction("openCamera") { (promise: Promise) in
      DispatchQueue.main.async {
        guard self.camera == nil else {
          promise.reject("CAMERA_BUSY", "The camera is already open.")
          return
        }
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("NO_PRESENTER", "The camera could not be presented.")
          return
        }
        let controller = ManualCameraController()
        controller.modalPresentationStyle = .fullScreen
        controller.onFinish = { [weak self, weak controller] result, error in
          controller?.dismiss(animated: true) {
            self?.camera = nil
            if let error = error {
              promise.reject("MANUAL_CAMERA", error.localizedDescription)
            } else if let result = result {
              promise.resolve(result)
            } else {
              promise.resolve(nil)
            }
          }
        }
        self.camera = controller
        presenter.present(controller, animated: true)
      }
    }
  }
}
