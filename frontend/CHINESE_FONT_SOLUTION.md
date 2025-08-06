# jsPDF 中文字体解决方案

## 问题描述
jsPDF 默认不支持中文字体，导致生成的PDF中中文显示为乱码或方框。

## 解决方案

### 方案1：使用内置字体支持（推荐）

参考用户提供的解决方案：

```javascript
import { jsPDF } from "jspdf"

// 1. 添加字体数据
var font = 'AAEAAAAVA...' // 完整的字体base64数据
var callAddFont = function () {
  this.addFileToVFS('simhei-normal.ttf', font);
  this.addFont('simhei-normal.ttf', 'simhei', 'normal');
};
jsPDF.API.events.push(['addFonts', callAddFont])

// 2. 创建PDF文档
const doc = new jsPDF() as any;
doc.setFont('simhei'); // 使用添加的字体

// 3. 在表格中使用
doc.autoTable({
  body: getData(data, headers),
  columns: headers,
  styles: {
    font: 'simhei', // 字体设置
    textColor: [0, 0, 0],
  },
})
```

### 方案2：使用项目中的字体文件

#### 步骤1：准备字体文件
将字体文件放在 `public/fonts/` 目录下：
- `msyh.ttf` - 微软雅黑
- `SourceHanSans.ttf` - 思源黑体
- `SimSun.ttf` - 宋体
- `SimHei.ttf` - 黑体

#### 步骤2：创建字体加载器
创建 `src/utils/chineseFontLoader.js`：

```javascript
import { jsPDF } from 'jspdf';

export const loadChineseFonts = async () => {
  try {
    // 加载微软雅黑字体
    const fontResponse = await fetch('/fonts/msyh.ttf');
    if (fontResponse.ok) {
      const fontArrayBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
      
      const callAddFont = function () {
        this.addFileToVFS('msyh-normal.ttf', fontBase64);
        this.addFont('msyh-normal.ttf', 'msyh', 'normal');
      };
      jsPDF.API.events.push(['addFonts', callAddFont]);
      console.log('✅ 微软雅黑字体加载成功');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ 字体文件加载失败:', error);
  }
  
  return false;
};
```

#### 步骤3：在PDF生成中使用
```javascript
import { loadChineseFonts } from '../utils/chineseFontLoader.js';

// 初始化字体
await loadChineseFonts();

// 创建PDF
const doc = new jsPDF();
doc.setFont('msyh'); // 使用微软雅黑字体
```

### 方案3：使用系统字体（备用）

```javascript
const doc = new jsPDF();

// 尝试使用系统字体
const systemFonts = ['SimSun', 'Microsoft YaHei', 'SimHei'];
let fontSet = false;

for (const font of systemFonts) {
  try {
    doc.setFont(font, 'normal');
    console.log(`✅ 使用系统字体: ${font}`);
    fontSet = true;
    break;
  } catch (e) {
    console.warn(`系统字体 ${font} 不可用`);
  }
}

if (!fontSet) {
  doc.setFont('helvetica', 'normal');
  console.log('⚠️ 使用默认字体 helvetica');
}
```

## 字体文件获取

### 免费中文字体
1. **思源黑体** - Adobe开源字体
   - 下载：https://github.com/adobe-fonts/source-han-sans/releases
   
2. **文泉驿字体** - 开源中文字体
   - 下载：http://wenq.org/wqy2/index.cgi?Download
   
3. **阿里巴巴普惠体** - 阿里巴巴开源字体
   - 下载：https://fonts.alibabagroup.com/

### 系统字体位置
- **Windows**: `C:\Windows\Fonts\`
- **macOS**: `/Library/Fonts/` 或 `~/Library/Fonts/`

## 字体文件处理

### 1. 转换为Base64
```javascript
// 将字体文件转换为base64字符串
const fontResponse = await fetch('/fonts/msyh.ttf');
const fontArrayBuffer = await fontResponse.arrayBuffer();
const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
```

### 2. 字体子集化
为了减小文件大小，可以只包含需要的字符：
- 使用在线工具：https://www.fontsquirrel.com/tools/webfont-generator
- 使用命令行工具：fonttools

### 3. 字体压缩
- TTF → WOFF2: 压缩率可达 30-50%
- 使用在线转换工具或命令行工具

## 完整示例

### 1. 字体加载器 (`src/utils/chineseFontLoader.js`)
```javascript
import { jsPDF } from 'jspdf';

export const loadChineseFonts = async () => {
  try {
    // 加载微软雅黑字体
    const fontResponse = await fetch('/fonts/msyh.ttf');
    if (fontResponse.ok) {
      const fontArrayBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
      
      const callAddFont = function () {
        this.addFileToVFS('msyh-normal.ttf', fontBase64);
        this.addFont('msyh-normal.ttf', 'msyh', 'normal');
      };
      jsPDF.API.events.push(['addFonts', callAddFont]);
      console.log('✅ 微软雅黑字体加载成功');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ 字体文件加载失败:', error);
  }
  
  return false;
};

export const setChineseFont = (doc, fontName = 'msyh') => {
  try {
    doc.setFont(fontName, 'normal');
    console.log(`✅ 设置字体成功: ${fontName}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ 字体设置失败: ${fontName}`, error);
    return false;
  }
};
```

### 2. PDF生成函数
```javascript
import { loadChineseFonts, setChineseFont } from '../utils/chineseFontLoader.js';

export const generateChinesePdf = async (content, config, resumeData) => {
  if (!content) throw new Error('无内容可生成PDF');
  
  // 初始化字体
  await loadChineseFonts();
  
  const doc = new jsPDF({ 
    orientation: 'portrait', 
    unit: 'mm', 
    format: 'a4'
  });
  
  // 检测是否包含中文字符
  const hasChineseChars = /[\u4e00-\u9fff]/.test(content);
  
  if (hasChineseChars) {
    // 尝试设置中文字体
    if (!setChineseFont(doc, 'msyh')) {
      if (!setChineseFont(doc, 'simhei')) {
        // 备用：使用系统字体
        const systemFonts = ['SimSun', 'Microsoft YaHei', 'SimHei'];
        let fontSet = false;
        for (const font of systemFonts) {
          if (setChineseFont(doc, font)) {
            fontSet = true;
            break;
          }
        }
        if (!fontSet) {
          doc.setFont('helvetica', 'normal');
        }
      }
    }
  } else {
    doc.setFont('helvetica', 'normal');
  }
  
  doc.setFontSize(12);
  
  // 渲染内容...
  // 这里添加具体的PDF生成逻辑
  
  return doc;
};
```

## 注意事项

1. **字体版权**: 确保使用的字体有合法的使用权限
2. **文件大小**: 字体文件较大，建议使用子集化或压缩
3. **加载时间**: 字体加载可能需要一些时间，建议添加加载提示
4. **兼容性**: 不同浏览器对字体支持可能不同，建议提供备用方案

## 常见问题

### Q: 字体文件太大怎么办？
A: 使用字体子集化工具，只保留需要的字符。

### Q: 字体显示不正常？
A: 检查字体文件是否损坏，尝试重新下载。

### Q: 如何知道字体是否加载成功？
A: 查看浏览器控制台的日志信息。

### Q: 可以同时使用多个字体吗？
A: 可以，系统会按优先级选择可用的字体。 