const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

// package.jsonからバージョンを取得
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

const extensionPackageFolderName = `${packageJson.name}-${packageJson.version}`;
const vsixFileName = `${extensionPackageFolderName}.vsix`;
const zipFileName = `${extensionPackageFolderName}.zip`;
const readmePath = path.join(__dirname, `../${extensionPackageFolderName}/extension/README.md`);
// vsce packageを実行するとpackage.jsonのrepository.urlの後に/raw/HEADを付与したものをREADMEの画像パスの前に追加するため
const repositoryImageURL = `${packageJson.repository.url}/raw/HEAD`;

// 既存のExtension展開フォルダがあれば削除
if (fs.existsSync(extensionPackageFolderName)) {
    fs.rmSync(extensionPackageFolderName, { recursive: true, force: true });
}

// 1. VSIXファイルの拡張子をZIPに変更
fs.renameSync(vsixFileName, zipFileName);

// 2. ZIPファイルを展開
const zip = new AdmZip(zipFileName);
zip.extractAllTo(extensionPackageFolderName, true);

// 3. README.mdを更新
fs.readFile(readmePath, 'utf8', (err, readmeData) => {
    if (err) throw err;

    // README.mdから画像パスを抽出
    const imagePaths = [];
    // ![any](${repositoryImageURL}/images/filename.ext)
    const regex = new RegExp(`!\\[.*?\\]\\(${repositoryImageURL}/(images/[^)]+)\\)`, 'g');
    let match;
    
    while ((match = regex.exec(readmeData)) !== null) {
        // "images/filename.ext" の部分を抽出してimagePathにセット
        imagePaths.push(match[1]);  
    }

    // imagePathsをループして画像をBase64エンコードし、README.md内で置き換える
    let updatedReadme = readmeData;
    imagePaths.forEach(imagePath => {
        const fullImagePath = path.join(__dirname, `../${extensionPackageFolderName}/extension/${imagePath}`);
        const imageData = fs.readFileSync(fullImagePath);
        const base64Image = imageData.toString('base64');
        updatedReadme = updatedReadme.replace(`${repositoryImageURL}/${imagePath}`, `data:image/${path.extname(imagePath).slice(1)};base64,${base64Image}`);
    });

    // mermaid があればpngにしてからBase64エンコード文字列に置き換えて埋め込む
    const mermaidRegex = /```mermaid([\s\S]*?)```/;
    const mermaidMatch = readmeData.match(mermaidRegex);
    if (mermaidMatch) {
        const mermaidContent = mermaidMatch[1].trim();
        const mermaidTempFile = path.join(__dirname, 'temp.mmd');
        const mermaidPngFile = path.join(__dirname, 'temp.png');

        // 一時ファイルにmermaidの内容を保存
        fs.writeFileSync(mermaidTempFile, mermaidContent);

        // mmdcを使用してmermaidをPNGに変換
        execSync(`mmdc -i ${mermaidTempFile} -o ${mermaidPngFile}`);

        // 生成されたPNGファイルを読み込み、Base64に変換
        const imageData = fs.readFileSync(mermaidPngFile);
        const base64Image = imageData.toString('base64');
        const base64ImageTag = `data:image/png;base64,${base64Image}`;
        // README.md内のmermaidの内容をBase64画像に置き換える
        updatedReadme = updatedReadme.replace(mermaidRegex, `![mermaid diagram](${base64ImageTag})`);

        // 一時ファイルを削除
        fs.unlinkSync(mermaidTempFile);
        fs.unlinkSync(mermaidPngFile);
    }

    fs.writeFile(readmePath, updatedReadme, 'utf8', (err) => {
        if (err) throw err;

        // imagesフォルダ内のファイルを削除（拡張機能のアイコンは直接参照されるためextensionIcon.pngを除く）
        const imagesDir = path.join(__dirname, `../${extensionPackageFolderName}/extension/images`);
        fs.readdirSync(imagesDir).forEach(file => {
            if (file !== 'extensionIcon.png') {
                fs.unlinkSync(path.join(imagesDir, file));
            }
        });
        // 他の階層にあるimagesフォルダを削除（../${extractedFolderName}/extension/imagesを除く）
        const deleteImagesFolders = (dir) => {
            fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'images' && fullPath !== path.join(__dirname, `../${extensionPackageFolderName}/extension/images`)) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                    } else {
                        deleteImagesFolders(fullPath);
                    }
                }
            });
        };
        deleteImagesFolders(path.join(__dirname, `../${extensionPackageFolderName}`));

        // 4. フォルダを再度ZIP化
        const newZip = new AdmZip();
        newZip.addLocalFolder(extensionPackageFolderName);
        newZip.writeZip(zipFileName);

        // 5. ZIPファイルの拡張子をVSIXに変更
        fs.renameSync(zipFileName, vsixFileName);

        console.log('VSIXパッケージがBase64画像で更新されました。');
    });
});
