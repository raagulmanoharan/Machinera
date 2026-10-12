Pod::Spec.new do |s|
  s.name = 'ZineCamera'
  s.version = '1.0.0'
  s.summary = 'Manual photo camera for Little Zine'
  s.description = 'Physical rear wide camera, manual exposure, untreated JPEG output.'
  s.license = { :type => '0BSD' }
  s.author = 'Little Zine'
  s.homepage = 'https://github.com/raagulmanoharan/Machinera'
  s.source = { :git => 'https://github.com/raagulmanoharan/Machinera.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'CoreImage', 'UIKit', 'ImageIO'
  s.source_files = '**/*.{h,m,mm,swift}'
end
