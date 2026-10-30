# Aplica a assinatura MANUAL só no target do app (os targets dos Pods ficam como estão).
# Uso: ruby ios-set-manual-signing.rb <Projeto.xcodeproj> <target> <team> <perfil> [identidade]
require 'xcodeproj'

proj_path, target_name, team, profile, identity = ARGV
identity ||= 'Apple Distribution'
abort 'uso: ios-set-manual-signing.rb <xcodeproj> <target> <team> <perfil> [identidade]' unless proj_path && target_name && team && profile

project = Xcodeproj::Project.open(proj_path)
target = project.targets.find { |t| t.name == target_name }
abort "target #{target_name} não existe em #{proj_path}" unless target

target.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_STYLE'] = 'Manual'
  c.build_settings['CODE_SIGN_IDENTITY'] = identity
  c.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = identity
  c.build_settings['DEVELOPMENT_TEAM'] = team
  c.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = profile
end
project.save
puts "Assinatura manual aplicada ao target #{target_name} (Pods intactos)."
