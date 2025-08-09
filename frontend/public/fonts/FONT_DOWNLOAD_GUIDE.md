# 字体下载指南

## 免费中文字体下载

### 1. 思源黑体 (Source Han Sans)
- **下载地址**: https://github.com/adobe-fonts/source-han-sans/releases
- **特点**: Adobe开源中文字体，支持中日韩文字
- **文件**: SourceHanSans.ttf (已包含在项目中)

### 2. 文泉驿字体
- **下载地址**: http://wenq.org/wqy2/index.cgi?Download
- **特点**: 开源中文字体，清晰易读
- **推荐**: 文泉驿微米黑、文泉驿正黑

### 3. 阿里巴巴普惠体
- **下载地址**: https://fonts.alibabagroup.com/
- **特点**: 阿里巴巴开源字体，现代简洁
- **推荐**: AlibabaPuHuiTi-Regular.ttf

### 4. 站酷字体
- **下载地址**: https://www.zcool.com.cn/special/zcoolfonts/
- **特点**: 站酷网开源字体，适合设计
- **推荐**: 站酷高端黑、站酷快乐体

## 系统字体获取

### Windows 系统字体
Windows 系统字体通常位于：
```
C:\Windows\Fonts\
```

常用字体文件：
- `simsun.ttc` - 宋体
- `msyh.ttc` - 微软雅黑
- `simhei.ttf` - 黑体
- `arial.ttf` - Arial
- `times.ttf` - Times New Roman

### macOS 系统字体
macOS 系统字体通常位于：
```
/Library/Fonts/
~/Library/Fonts/
```

常用字体文件：
- `PingFang.ttc` - 苹方
- `Hiragino Sans GB.ttc` - 冬青黑体
- `Arial.ttf` - Arial
- `Times.ttf` - Times New Roman

## 字体文件格式说明

### 支持的格式
- **TTF** (.ttf) - TrueType Font，最常用
- **OTF** (.otf) - OpenType Font，功能更丰富
- **WOFF** (.woff) - Web Open Font Format，网页优化
- **WOFF2** (.woff2) - Web Open Font Format 2.0，压缩率更高

### 推荐格式
- **PDF生成**: 推荐使用 TTF 格式
- **网页显示**: 推荐使用 WOFF2 格式

## 字体文件命名规范

建议使用以下命名规范：
```
字体名-字重-语言.扩展名
```

示例：
- `SimSun-Regular.ttf` - 宋体常规
- `MicrosoftYaHei-Bold.ttf` - 微软雅黑粗体
- `Arial-Regular.ttf` - Arial常规
- `TimesNewRoman-Regular.ttf` - Times New Roman常规

## 字体文件大小优化

### 1. 子集化字体
只包含需要的字符，可以大大减小文件大小：
- 使用在线工具：https://www.fontsquirrel.com/tools/webfont-generator
- 使用命令行工具：fonttools

### 2. 压缩字体
- TTF → WOFF2: 压缩率可达 30-50%
- 使用在线转换工具或命令行工具

### 3. 字体文件大小建议
- 单个字体文件建议不超过 5MB
- 如果文件过大，考虑使用子集化或压缩

## 字体版权说明

### 免费字体
- 思源黑体 (Source Han Sans) - Adobe开源
- 文泉驿字体 - 开源
- 阿里巴巴普惠体 - 阿里巴巴开源
- 站酷字体 - 站酷网开源

### 商业字体
- 微软雅黑 - 微软商业字体
- 宋体、黑体 - 系统字体，使用需注意版权
- Arial、Times New Roman - 商业字体

### 使用建议
1. 优先使用免费开源字体
2. 商业项目需注意字体版权
3. 系统字体通常可以免费使用
4. 不确定时请查看字体授权协议

## 快速开始

1. 下载推荐的免费字体文件
2. 将字体文件重命名为标准格式
3. 放置到 `public/fonts/` 目录
4. 刷新页面，系统会自动检测并加载

## 常见问题

### Q: 字体文件太大怎么办？
A: 使用字体子集化工具，只保留需要的字符。

### Q: 字体显示不正常？
A: 检查字体文件是否损坏，尝试重新下载。

### Q: 如何知道字体是否加载成功？
A: 使用字体管理组件查看字体状态。

### Q: 可以同时使用多个字体吗？
A: 可以，系统会按优先级选择可用的字体。 