// electron-builder afterPack 钩子：
// 因为 build.win.signAndEditExecutable = false（用于绕开 winCodeSign 解压失败），
// electron-builder 不会跑 rcedit，exe 内嵌的仍是 Electron 默认图标与版本信息。
// 这里用 rcedit 自己补上图标与版本号。
//
// 注意：rcedit 的版本字段必须放在 version-string 对象里，写成扁平的
// 'file-description' / 'product-name' 不会生效（只认 file-version / product-version）。
const path = require('node:path')
const fs = require('node:fs')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return
  const pkg = require(path.join(context.packager.projectDir, 'package.json'))
  const productName = (pkg.build && pkg.build.productName) || pkg.name
  const exe = path.join(context.appOutDir, productName + '.exe')
  const icon = path.join(context.packager.projectDir, 'resources', 'icon.ico')
  if (!fs.existsSync(exe)) { console.log('  • afterPack: 找不到 exe，跳过'); return }

  const opts = {
    'file-version': pkg.version,
    'product-version': pkg.version
  }
  if (fs.existsSync(icon)) opts.icon = icon
  opts['version-string'] = {
    CompanyName: 'A29DJX',
    FileDescription: productName,
    InternalName: pkg.name,
    LegalCopyright: 'MIT License',
    OriginalFilename: productName + '.exe',
    ProductName: productName,
    FileVersion: pkg.version,
    ProductVersion: pkg.version
  }

  const { rcedit } = require('rcedit')
  await rcedit(exe, opts)
  console.log('  • afterPack: 已写入图标与版本信息 -> ' + path.basename(exe))
}
