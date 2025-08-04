// 测试Word生成功能
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export const testWordGeneration = async () => {
  try {
    console.log('开始测试Word生成...');
    
    // 创建简单的Word文档
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838
            },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "测试简历",
                size: 32,
                bold: true
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "这是一个测试文档，用于验证Word生成功能是否正常工作。",
                size: 24
              })
            ],
            spacing: { after: 200 }
          })
        ]
      }]
    });

    // 生成并下载文件
    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'test_resume.docx');
    
    console.log('测试Word生成成功');
    return true;
  } catch (error) {
    console.error('测试Word生成失败:', error);
    return false;
  }
}; 