import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const generateWebsitePackage = async () => {
  const zip = new JSZip();

  // Add Blogger template
  const templateResponse = await fetch('/blogger-template.xml');
  const templateContent = await templateResponse.text();
  zip.file('blogger-template.xml', templateContent);

  // Add README
  const readmeContent = `# Hướng dẫn tích hợp TimeTracker vào Blogger

Vì Blogger không cho phép upload trực tiếp các file JS/CSS dung lượng lớn, bạn cần thực hiện theo các bước sau:

## Bước 1: Build ứng dụng
Chạy lệnh sau trong terminal của dự án:
\`npm run build\`

## Bước 2: Host file JS/CSS
- Sau khi build, bạn sẽ thấy thư mục \`dist/assets/\`.
- Hãy upload toàn bộ các file trong \`dist/assets/\` lên một dịch vụ lưu trữ file miễn phí (ví dụ: GitHub Pages, Firebase Hosting, hoặc các dịch vụ CDN).
- Sau khi upload, bạn sẽ nhận được các đường dẫn (URL) trực tiếp đến file JS và CSS của bạn.

## Bước 3: Cập nhật Template Blogger
- Mở file \`blogger-template.xml\` (trong file ZIP này).
- Tìm dòng: 
  \`<script type="module" src="URL_TO_YOUR_HOSTED_INDEX_JS"></script>\`
  và thay \`URL_TO_YOUR_HOSTED_INDEX_JS\` bằng link file JS bạn vừa upload ở Bước 2.
- Tìm dòng:
  \`<link rel="stylesheet" href="URL_TO_YOUR_HOSTED_INDEX_CSS"/>\`
  và thay \`URL_TO_YOUR_HOSTED_INDEX_CSS\` bằng link file CSS bạn vừa upload ở Bước 2.

## Bước 4: Cài đặt vào Blogger
1. Truy cập vào trang quản trị Blogger.
2. Chọn **Chủ đề (Theme)** -> **Chỉnh sửa HTML (Edit HTML)**.
3. Xóa toàn bộ mã cũ và dán nội dung file \`blogger-template.xml\` đã chỉnh sửa vào.
4. Nhấn **Lưu (Save)**.
`;
  zip.file('README.md', readmeContent);

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'TimeTracker-Website-Package.zip');
};
