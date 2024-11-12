プライベートなVS Code拡張機能（vsixを手動インストールする場合）にREADMEで画像とMermaidの図が表示できない問題への対応スクリプトを紹介するためのリポジトリです。
詳細はZenの記事「[社内でのみ共有したい自作VS Code拡張機能のREADMEで画像とMermaidの図が表示できない問題を解決した](https://zenn.dev/yuma_prog/articles/vscode-private-extension-readme-image)」をご覧ください。
[vscode-extension-samples/chat-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/chat-sample)をベースにしています。

# 画像表示テスト
パブリックに公開したくない画像：images/private.png

![相対パス](images/private.png)

パブリックに公開している画像：images/public.jpg

![パブリックな画像の相対パス](images/public.jpg)

パブリックに公開している画像：https://github.com/yuma-722/test/raw/HEAD/images/public.jpg

![パブリックな画像のフルパス](https://github.com/yuma-722/test/raw/HEAD/images/public.jpg)

# 前提となるディレクトリ構成

postPackage.jsの前提となるディレクトリ構成です。

```markdown
VS Code 拡張機能のroot/
├── package.json
├── scripts/
│   └── postPackage.js
└──images/
    └── example.png
```
# postPackage.jsのフロー

```mermaid
graph TD
    A[開始] --> B[package.jsonからバージョン取得]
    B --> C[既存の展開フォルダを削除]
    C --> D[VSIXファイルの拡張子をZIPに変更]
    D --> E[ZIPファイルを展開]
    
    E --> F[README.mdを読み込み]
    
    F --> G{画像パスの処理}
    G --> H[画像パスを抽出]
    H --> I[画像をBase64エンコード]
    I --> J[README.md内の画像パスを置換]
    
    F --> K{Mermaid図の処理}
    K --> L[Mermaid内容を一時ファイルに保存]
    L --> M[MermaidをPNGに変換]
    M --> N[PNGをBase64エンコード]
    N --> O[Mermaid内容を画像に置換]
    
    J --> P[更新したREADME.mdを保存]
    O --> P
    
    P --> Q[不要な画像ファイルを削除]
    Q --> R[フォルダを再度ZIP化]
    R --> S[ZIPの拡張子をVSIXに変更]
    S --> T[完了]
```