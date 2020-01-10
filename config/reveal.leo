<?xml version="1.0" encoding="utf-8"?>
<!-- Created by Leo: http://leoeditor.com/leo_toc.html -->
<leo_file xmlns:leo="http://leoeditor.com/namespaces/leo-python-editor/1.1" >
<leo_header file_format="2"/>
<globals/>
<preferences/>
<find_panel_settings/>
<vnodes>
<v t="leo.20180902120538.1"><vh>@settings</vh>
<v t="leo.20180902120538.2"><vh>@data qt-gui-plugin-style-sheet</vh></v>
<v t="leo.20180902120538.3"><vh>@string initial_split_orientation = horizontal</vh></v>
</v>
<v t="leo.20180902120523.1"><vh>編輯 reveal</vh>
<v t="leo.20180902120523.2"><vh>@path ./../reveal</vh>
<v t="leo.20180902120523.3"><vh>@clean index.html</vh>
<v t="leo.20180902120523.4"><vh>html</vh>
<v t="leo.20180902120523.5"><vh>head</vh></v>
<v t="leo.20180902120523.6"><vh>body</vh>
<v t="leo.20180902120523.7"><vh>reveal div</vh>
<v t="leo.20180902120523.8"><vh>slides div</vh>
<v t="leo.20180902120523.9"><vh>封面投影片</vh>
<v t="leo.20180902120523.10"><vh>封面投影片內容</vh></v>
</v>
<v t="leo.20180902120523.11"><vh>課程簡介</vh>
<v t="leo.20180902120523.12"><vh>課程簡介</vh></v>
</v>
<v t="leo.20190903120120.1"><vh>課程目標</vh>
<v t="leo.20190903120120.2"><vh>課程目標</vh></v>
</v>
<v t="leo.20190903120516.1"><vh>何謂電腦輔助設計?</vh>
<v t="leo.20190903120516.2"><vh>何謂電腦輔助設計?</vh></v>
</v>
<v t="leo.20191025072717.1"><vh>W1-W9 摘要</vh>
<v t="leo.20191025072736.1"><vh>W1-W9 學習摘要</vh></v>
</v>
<v t="leo.20191025075437.1"><vh>W7 摘要</vh>
<v t="leo.20191025075437.2"><vh>W7 學習摘要</vh></v>
</v>
<v t="leo.20191025074044.1"><vh>W10-W18 摘要</vh>
<v t="leo.20191025074044.2"><vh>W10-W18 學習摘要</vh></v>
</v>
<v t="leo.20190903115511.1"><vh>快捷鍵</vh>
<v t="leo.20190903115511.2"><vh>投影片快捷鍵</vh></v>
</v>
<v t="leo.20180902120523.13"><vh>各式內容引用範例</vh>
<v t="leo.20180902120523.14"><vh>導入數學符號與方程式</vh>
<v t="leo.20180902120523.15"><vh>LaTeX 格式方程式</vh></v>
</v>
<v t="leo.20180902120523.16"><vh>導入縮排程式碼</vh>
<v t="leo.20180902120523.17"><vh>引用程式碼</vh></v>
</v>
<v t="leo.20180902120523.18"><vh>導入影片</vh>
<v t="leo.20180902120523.19"><vh>iframe 導入影片</vh></v>
</v>
</v>
</v>
</v>
</v>
</v>
</v>
</v>
</v>
</vnodes>
<tnodes>
<t tx="leo.20180902120523.1"></t>
<t tx="leo.20180902120523.10">## Computer Aided Design

### KMOLab

&lt;small&gt;
Created by [KMOLab](http://lab.kmol.info/)
&lt;/small&gt;

[2019 Fall CAD](./../blog/index.html)


</t>
<t tx="leo.20180902120523.11">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;


						
</t>
<t tx="leo.20180902120523.12"># 課程簡介

* 從 Solvespace 編譯與使用開始 (必選)
* 安裝 SolidWorks 2017 與零組件繪圖
* 安裝 Inventor 2018 與零組件繪圖
* 安裝 Siemens NX12 與零組件繪圖 (必選)
* 安裝 PTC Creo 6 與零組件繪圖
* 分組執行越野車/行走機構設計與分析專案 (必選)

</t>
<t tx="leo.20180902120523.13">&lt;section&gt;
@others
&lt;/section&gt;

</t>
<t tx="leo.20180902120523.14">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
&lt;!-- 請注意, @others 不可以內縮 --&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;



						
</t>
<t tx="leo.20180902120523.15"># 數學符號與方程式

Inline math equations go in like so: $\omega = d\phi / dt$. Display
math should get its own line and be put in in double-dollarsigns:

$$I = \int \rho R^{2} dV$$
</t>
<t tx="leo.20180902120523.16">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
&lt;!-- 請注意, @others 不可以內縮 --&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;



						
</t>
<t tx="leo.20180902120523.17">## 利用 Markdown 寫投影片
以下利用 Markdown 格式展示 Python 程式碼:
```
@language python
# use threading and subprocess to threading the make process
import os
import subprocess
import threading

def domake():
    
    path = "../exposed/api/exposed"
    ubuntu = "../Ubuntu"
    
    # create obj path
    
    if not os.path.exists(path+"/../obj"):
        os.makedirs(path+"/../obj")
    
    subprocess.call(["make", "clean"], cwd=path)
    subprocess.call("make", cwd=path)
    subprocess.call(["cp", "{libslvs.so, _slvs.so, slvs.py}", ubuntu], cwd=path)
    subprocess.call(["python3", "circle_ex.py"], cwd=path+"/"+ubuntu)
    
make = threading.Thread(target=domake)
make.start()
```
</t>
<t tx="leo.20180902120523.18">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;


						
</t>
<t tx="leo.20180902120523.19">## 使用 iframe 導入影片

### 導入影片 template

&lt;iframe src="https://player.vimeo.com/video/183950627" width="640" height="492" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen&gt;&lt;/iframe&gt;
</t>
<t tx="leo.20180902120523.2"></t>
<t tx="leo.20180902120523.3">@language xml
@tabwidth -4
@others

</t>
<t tx="leo.20180902120523.4">&lt;!doctype html&gt;
&lt;html lang="en"&gt;
@others
&lt;/html&gt;
</t>
<t tx="leo.20180902120523.5">&lt;head&gt;
    &lt;meta charset="utf-8"&gt;
&lt;title&gt;
2019 Fall CAD
&lt;/title&gt;
    &lt;meta name="description" content="A framework for easily creating beautiful presentations using HTML"&gt;
    &lt;meta name="author" content="Hakim El Hattab"&gt;
    
    &lt;meta name="apple-mobile-web-app-capable" content="yes"&gt;
    &lt;meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"&gt;
    
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"&gt;
    
    &lt;link rel="stylesheet" href="css/reveal.css"&gt;
    &lt;link rel="stylesheet" href="css/theme/black.css" id="theme"&gt;
    
    &lt;!-- Theme used for syntax highlighting of code --&gt;
    &lt;link rel="stylesheet" href="lib/css/zenburn.css"&gt;

    &lt;!-- Printing and PDF exports --&gt;
    &lt;script&gt;
        var link = document.createElement( 'link' );
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = window.location.search.match( /print-pdf/gi ) ? 'css/print/pdf.css' : 'css/print/paper.css';
        document.getElementsByTagName( 'head' )[0].appendChild( link );
    &lt;/script&gt;

    &lt;!--[if lt IE 9]&gt;
    &lt;script src="lib/js/html5shiv.js"&gt;&lt;/script&gt;
    &lt;![endif]--&gt;
&lt;/head&gt;

</t>
<t tx="leo.20180902120523.6">&lt;body&gt;
@others
&lt;script src="lib/js/head.min.js"&gt;&lt;/script&gt;
&lt;script src="js/reveal.js"&gt;&lt;/script&gt;
&lt;script&gt;
        // More info https://github.com/hakimel/reveal.js#configuration
        Reveal.initialize({
            controls: true,
            progress: true,
            history: true,
            center: true,

            transition: 'slide', // none/fade/slide/convex/concave/zoom

            // More info https://github.com/hakimel/reveal.js#dependencies
            dependencies: [
                { src: 'lib/js/classList.js', condition: function() { return !document.body.classList; } },
                { src: 'plugin/markdown/marked.js', condition: function() { return !!document.querySelector( '[data-markdown]' ); } },
                { src: 'plugin/markdown/markdown.js', condition: function() { return !!document.querySelector( '[data-markdown]' ); } },
                { src: 'plugin/highlight/highlight.js', async: true, callback: function() { hljs.initHighlightingOnLoad(); } },
                { src: 'plugin/zoom-js/zoom.js', async: true },
                { src: 'plugin/notes/notes.js', async: true },
                { src: 'plugin/math/math.js', async: true }
            ]
        });
&lt;/script&gt;
&lt;/body&gt;

</t>
<t tx="leo.20180902120523.7">&lt;div class="reveal"&gt;
@others
&lt;/div&gt;

</t>
<t tx="leo.20180902120523.8">&lt;!-- Any section element inside of this container is displayed as a slide --&gt;
&lt;div class="slides"&gt;
@others
&lt;/div&gt;

</t>
<t tx="leo.20180902120523.9">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;


						
</t>
<t tx="leo.20180902120538.1"></t>
<t tx="leo.20180902120538.2">QTreeWidget {
    /* These apply to the selected item, but not to editing items.*/
    background-color: #ffffec; /* Leo's traditional tree color */
    selection-color: black; /* was white */
    selection-background-color: lightgrey;
    /* font-family: SansSerif; */
    /*font-family: DejaVu Sans Mono;*/
    font-family:YaHei Mono;
    /* 標題字型大小設定 */
    font-size: 20px;
    font-weight: normal; /* normal,bold,100,..,900 */
    font-style: normal; /* normal, italic,oblique */
 }

/* Headline edit widgets */
QTreeWidget QLineEdit {
    background-color: cornsilk;
    selection-color: white;
    selection-background-color: blue;
    /*font-family: DejaVu Sans Mono;*/    
    font-family:YaHei Mono;
    /* 沒有特別對應字型大小 */
    font-size: 20px;
    font-weight: normal; /* normal,bold,100,..,900 */
    font-style: normal; /* normal, italic,oblique */
}

/* The log panes */
QTextEdit {
    background-color: #f2fdff;
    selection-color: red;
    selection-background-color: blue;
    /* font-family: Courier New; */
    font-family:YaHei Mono;
    /* log font 大小 */
    font-size: 20px;
    font-weight: normal; /* normal,bold,100,..,900 */
    font-style: normal; /* normal, italic,oblique */
}

/* The body pane */
QTextEdit#richTextEdit {
    background-color: #fdf5f5; /* A kind of pink. */
    selection-color: white;
    selection-background-color: red;
    /*font-family: DejaVu Sans Mono;*/
    /* font-family: Courier New; */
    font-family:YaHei Mono;
    /* 內文字型大小 */
    font-size: 20px;
    font-weight: normal; /* normal,bold,100,..,900 */
    font-style: normal; /* normal,italic,oblique */
}

QLabel {
    font-family:YaHei Mono;'CherryPy', 'pytz', 'mako', 'beautifulsoup4', 'pymysql', 'peewee'
    /* 下方的 Minibuffer 標題字型大小 */
    font-size: 20px;
    font-weight: normal; /* normal,bold,100,..,900 */
    font-style: normal; /* normal,italic,oblique */
}

/* Editor labels */
QLineEdit#editorLabel {
    background-color: #ffffec;
    font-family:YaHei Mono;
    /* 沒有直接對應字型大小 */
    font-size: 20px;
    font-weight: normal; /* normal,bold,100,..,900 */
    font-style: normal; /* normal,italic,oblique */
    border: 2px;
    margin: 2px;
}</t>
<t tx="leo.20180902120538.3">horizontal: body pane to the left
vertical: body pane on the botton</t>
<t tx="leo.20190903115511.1">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;


						
</t>
<t tx="leo.20190903115511.2"># 投影片快捷鍵

* 利用箭頭上下前後換頁
* 按 f 鍵進入全螢幕模式 (full screen)
* 按 s 鍵可以顯示投影片筆記 (show)
* 按 o 鍵可以切換單張或全域檢視 (overview)
* 按 b 或 . 鍵可以切換螢幕黑屏 (black)
* 按 Esc 可以退出全螢幕或全域檢視 (Escape)

</t>
<t tx="leo.20190903120120.1">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;


						
</t>
<t tx="leo.20190903120120.2"># 課程目標

* 了解何謂電腦輔助機械設計?
* 鼓勵使用合法的教育版 CAD 套件
* 鼓勵自行開發電腦輔助設計程式
* 透過分組執行專案, 學習協同設計
* 透過網站的維護, 學習網際內容管理
* 透過字幕影片錄製, 學習口語文字表達

</t>
<t tx="leo.20190903120516.1">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;


						
</t>
<t tx="leo.20190903120516.2"># 電腦輔助機械設計?

* 以電腦協助創建、修改、分析或最佳化機械設計
* 何謂機械設計? 
* 固體流體與軟體元件巧妙結合, 達成特定目的
* 設計 - 權衡約束條件後所完成的安排及表達
* 設計的目的在尋求目標達成的最合理安排
* 電腦輔助機械設計的目的在求價值最大化

</t>
<t tx="leo.20191025072717.1">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;</t>
<t tx="leo.20191025072736.1"># W1-W9 學習摘要

* W2 - 課程內容說明、亂數分組、建立各學員網站
* W3 - 任務一 Solvespace 編譯與參數繪圖應用說明
* W5 - Solvespace 編譯與參數繪圖示範
* W6 - V-rep 網際雙輪車控制模擬示範
* W7 - 統一網站架構, Solvespace 編譯與繪圖驗證
* W8 - Solvespace 與 V-rep 應用, 雙輪車與行走機構
* W9 - 期中考週 - 任務一驗證, 學員 reveal 期中簡報

</t>
<t tx="leo.20191025074044.1">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;</t>
<t tx="leo.20191025074044.2"># W10-W18 學習摘要

* W10 - 開始全班維護一個協同倉儲, 各參數繪圖套件安裝
* W11-W13 - Solvespace 與 NX12 參數繪圖與 V-rep 結合應用
* W14-W15 - NX12 零件工程分析
* W16-W17 - V-rep 越野車與行走機構模擬
* W18 - 期末考週 - 各任務驗證, 分組 reveal 期末簡報

</t>
<t tx="leo.20191025075437.1">&lt;section data-markdown&gt;
    &lt;script type="text/template"&gt;
@others
    &lt;/script&gt;
&lt;/section&gt;</t>
<t tx="leo.20191025075437.2"># W7 統一網站架構與任務一驗證

* 請各組討論後, 統一網站架構, 以至多五個 H1 為限
* 將 Solvespace 編譯過程拍成帶字幕影片後上傳並嵌入個人網站 (在 Help-&gt;About 視窗中, 納入 "This Solvespace is compiled by 學號")
* Solvespace  繪圖驗證, 從[零件網頁](http://mde.tw/cad2019/content/CAD2CAE.html) 自選, 可採 Solvespace 完成繪圖的零件, 將過程拍成帶字幕的影片後上傳嵌入個人網站 ([2a 回報處](https://github.com/mdecourse/cad2019/issues/17), [2b 回報處](https://github.com/mdecourse/cad2019/issues/18))



</t>
</tnodes>
</leo_file>
