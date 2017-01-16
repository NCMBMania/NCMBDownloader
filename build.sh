rm NCMBDownloader-darwin-x64.zip NCMBDownloader-win32-x64.zip
electron-packager . NCMBDownloader --platform=win32,darwin --arch=x64 --icon=icon.ico --version=1.4.12 --overwrite --ignore=node_modules/
zip -r NCMBDownloader-darwin-x64.zip NCMBDownloader-darwin-x64
zip -r NCMBDownloader-win32-x64.zip NCMBDownloader-win32-x64
rm -Rf NCMBDownloader-darwin-x64
rm -Rf NCMBDownloader-win32-x64

