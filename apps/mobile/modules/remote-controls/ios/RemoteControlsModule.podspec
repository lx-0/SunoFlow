Pod::Spec.new do |s|
  s.name           = 'RemoteControlsModule'
  s.version        = '1.0.0'
  s.summary        = 'Lock-screen / Control Center next & previous track remote commands'
  s.description    = 'Registers MPRemoteCommandCenter next/previous track commands and bridges them to JS, so a custom JS-managed queue can advance from the lock screen (expo-audio has no next/prev lock-screen support).'
  s.author         = 'SunoFlow'
  s.homepage       = 'https://sunoflow.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
