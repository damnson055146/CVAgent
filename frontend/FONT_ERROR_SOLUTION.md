# 字体错误解决方案

## 问题描述

控制台出现以下错误：
```
console.js:12 Unable to look up font label for font 'msyh', 'bold'. Refer to getFontList() for available fonts.
```

## 问题原因

1. **字体文件不完整**：当前只有 `msyh-normal.js` 文件，只包含了微软雅黑字体的 normal（常规）样式
2. **代码尝试使用 bold 样式**：PDF生成代码中尝试使用 `doc.setFont(fontName, 'bold')` 来设置粗体
3. **jsPDF 找不到对应的字体**：jsPDF 需要对应的字体文件才能使用不同的样式（normal、bold、italic 等）

## 解决方案

### 方案1：使用字体配置系统（已实现）

创建了 `fontConfig.js` 文件，提供安全的字体设置机制：

1. **字体配置**：明确定义每个字体可用的样式
2. **样式回退**：当请求的样式不可用时，自动回退到可用样式
3. **字号模拟**：通过调整字号来模拟粗体效果
4. **安全设置**：提供 `safeSetFont()` 函数，避免字体设置错误

### 方案2：添加更多字体文件（可选）

如果需要真正的粗体和斜体效果，可以下载对应的字体文件：

#### 需要的字体文件：
- `msyh-bold.js` - 微软雅黑粗体
- `msyh-italic.js` - 微软雅黑斜体
- `msyh-bolditalic.js` - 微软雅黑粗斜体

#### 下载方法：
1. 从 Windows 系统字体目录获取：`C:\Windows\Fonts\msyhbd.ttc`
2. 使用字体转换工具转换为 jsPDF 可用的格式
3. 放置到 `public/fonts/` 目录

## 当前实现

### 字体配置文件 (`fontConfig.js`)

```javascript
export const FONT_CONFIG = {
  msyh: {
    name: 'msyh',
    displayName: '微软雅黑',
    availableStyles: ['normal'], // 只有 normal 样式可用
    fallbackStyles: {
      bold: 'normal', // bold 样式回退到 normal
      italic: 'normal', // italic 样式回退到 normal
      bolditalic: 'normal' // bolditalic 样式回退到 normal
    },
    fontSizeMultiplier: {
      bold: 1.2, // bold 效果通过增大字号实现
      italic: 1.0, // italic 效果暂时不实现
      bolditalic: 1.2
    }
  }
};
```

### 安全字体设置函数

```javascript
export const safeSetFont = (doc, fontName, style = 'normal') => {
  try {
    const config = getFontConfig(fontName);
    const actualStyle = getFontStyleFallback(fontName, style);
    const fontSizeMultiplier = getFontSizeMultiplier(fontName, style);
    
    // 设置字体
    doc.setFont(config.name, actualStyle);
    
    // 如果需要模拟效果，调整字号
    if (style !== actualStyle && fontSizeMultiplier !== 1.0) {
      const currentFontSize = doc.getFontSize();
      doc.setFontSize(currentFontSize * fontSizeMultiplier);
    }
    
    return true;
  } catch (error) {
    console.warn(`字体设置失败: ${fontName} ${style}`, error);
    // 回退到默认字体
    try {
      doc.setFont('helvetica', 'normal');
      return false;
    } catch (fallbackError) {
      console.error('回退字体也失败:', fallbackError);
      return false;
    }
  }
};
```

## 使用方法

### 1. 测试字体配置

在浏览器控制台中运行：
```javascript
window.testFontConfig();
```

### 2. 在代码中使用

```javascript
import { safeSetFont, restoreFont } from './utils/fontConfig.js';

// 设置字体
const originalFontSize = doc.getFontSize();
safeSetFont(doc, 'msyh', 'bold'); // 会自动回退到 normal 并增大字号

// 渲染文本
doc.text('粗体文本', x, y);

// 恢复字体设置
restoreFont(doc, originalFontSize);
```

## 测试

1. 打开浏览器开发者工具
2. 点击"测试字体配置"按钮
3. 查看控制台输出，确认字体配置正确
4. 尝试生成PDF，确认不再出现字体错误

## 注意事项

1. **性能影响**：字号模拟粗体效果会增加文件大小
2. **视觉效果**：模拟的粗体效果可能与真正的粗体略有不同
3. **兼容性**：字体配置系统确保在所有环境下都能正常工作

## 未来改进

1. **添加更多字体文件**：下载微软雅黑的 bold、italic 等样式
2. **字体子集化**：只包含需要的字符，减小文件大小
3. **字体缓存**：实现字体文件的缓存机制
4. **更多字体支持**：添加其他中文字体的支持 