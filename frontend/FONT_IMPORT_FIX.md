# 字体导入修复总结

## 问题描述

在 `pdfGenerators.js` 中导入 `msyhFontLoader.js` 时出现错误：

```
Cannot import non-asset file /fonts/msyh-normal.js which is inside /public. 
JS/CSS files inside /public are copied as-is on build and can only be referenced 
via <script src> or <link href> in html. If you want to get the URL of that file, 
use /fonts/msyh-normal.js?url instead.
```

## 问题原因

1. **错误的导入方式**: 在 `msyhFontLoader.js` 中使用了 `import('/fonts/msyh-normal.js')` 动态导入
2. **Vite 限制**: Vite 不允许直接导入 `/public` 目录下的文件
3. **文件格式**: `msyh-normal.js` 是一个28MB的大文件，包含字体数据

## 解决方案

### 1. 移除动态导入
- 删除了 `import('/fonts/msyh-normal.js')` 语句
- 改用 `fetch('/fonts/msyh-normal.js')` 方式加载

### 2. 增强字体数据提取
支持多种字体数据格式：
```javascript
// 格式1: var font = 'base64data'
const fontDataMatch1 = fontText.match(/var\s+font\s*=\s*['"`]([^'"`]+)['"`]/);

// 格式2: export default 'base64data'
const fontDataMatch2 = fontText.match(/export\s+default\s*['"`]([^'"`]+)['"`]/);

// 格式3: module.exports = 'base64data'
const fontDataMatch3 = fontText.match(/module\.exports\s*=\s*['"`]([^'"`]+)['"`]/);

// 格式4: 直接查找base64数据
const base64Match = fontText.match(/['"`]([A-Za-z0-9+/]{1000,}={0,2})['"`]/);
```

### 3. 添加备用方案
如果 `msyh-normal.js` 加载失败，尝试其他字体文件：
- `/fonts/sourcehan.ttf`
- `/fonts/SimSun.ttf`
- `/fonts/SimHei.ttf`

### 4. 改进错误处理
- 添加详细的日志输出
- 提供字体加载失败时的回退机制
- 支持多种中文字体

## 修改的文件

### `frontend/src/utils/msyhFontLoader.js`
- 移除动态导入语句
- 增强字体数据提取逻辑
- 添加备用字体加载方案
- 改进错误处理和日志

### `frontend/src/utils/pdfGenerators.js`
- 导入修复后的 `msyhFontLoader.js`
- 使用新的字体加载函数

## 测试建议

1. **检查控制台日志**: 查看字体加载是否成功
2. **测试PDF生成**: 验证中文字体是否正确显示
3. **测试备用方案**: 如果主字体失败，检查备用字体是否工作

## 预期结果

- ✅ 消除 Vite 构建错误
- ✅ 成功加载中文字体
- ✅ PDF 生成时正确显示中文
- ✅ 提供字体加载失败时的回退机制

## 注意事项

1. **字体文件大小**: `msyh-normal.js` 文件较大(28MB)，可能影响加载速度
2. **网络请求**: 使用 `fetch` 加载字体文件需要网络请求
3. **兼容性**: 确保浏览器支持 `fetch` API
4. **字体版权**: 注意字体文件的版权和使用许可

## 后续优化建议

1. **字体子集化**: 只包含需要的字符，减小文件大小
2. **字体压缩**: 使用 WOFF2 格式压缩字体文件
3. **预加载**: 在应用启动时预加载字体文件
4. **缓存策略**: 实现字体文件的缓存机制 