export interface Quote {
  text: string;
  category: string;
}

export const QUOTES: Quote[] = [
  // Life & Positivity
  { text: "Đừng để quá khứ đánh cắp hiện tại của bạn.", category: "Cuộc sống & Tích cực" },
  { text: "Hạnh phúc không phải là có những gì bạn muốn, mà là trân trọng những gì bạn có.", category: "Cuộc sống & Tích cực" },
  { text: "Hãy sống như thể hôm nay là ngày cuối cùng.", category: "Cuộc sống & Tích cực" },
  { text: "Sự lạc quan là niềm tin dẫn tới thành tựu.", category: "Cuộc sống & Tích cực" },
  { text: "Hãy là người mang lại ánh sáng cho người khác.", category: "Cuộc sống & Tích cực" },
  { text: "Mọi chuyện rồi sẽ ổn, nếu chưa ổn thì đó chưa phải là cuối cùng.", category: "Cuộc sống & Tích cực" },
  { text: "Thay vì than vãn về bóng tối, hãy thắp lên một ngọn nến.", category: "Cuộc sống & Tích cực" },
  { text: "Bình yên đến từ bên trong, đừng tìm nó ở bên ngoài.", category: "Cuộc sống & Tích cực" },
  { text: "Một tâm hồn tích cực sẽ thu hút những điều tích cực.", category: "Cuộc sống & Tích cực" },
  { text: "Hãy bao dung với lỗi lầm của bản thân.", category: "Cuộc sống & Tích cực" },
  { text: "Cuộc sống rất ngắn ngủi, đừng lãng phí nó vào những điều tiêu cực.", category: "Cuộc sống & Tích cực" },

  // Action & Dreams
  { text: "Ước mơ mà không hành động thì chỉ là ảo tưởng.", category: "Hành động & Ước mơ" },
  { text: "Hãy làm những gì bạn có thể, với những gì bạn có, ở bất cứ nơi đâu.", category: "Hành động & Ước mơ" },
  { text: "Đừng nói, hãy làm. Đừng hứa, hãy chứng minh.", category: "Hành động & Ước mơ" },
  { text: "Tương lai thuộc về những ai tin vào vẻ đẹp của những giấc mơ.", category: "Hành động & Ước mơ" },
  { text: "Thời điểm tốt nhất để trồng cây là 20 năm trước. Thời điểm tốt thứ hai là ngay bây giờ.", category: "Hành động & Ước mơ" },
  { text: "Đừng chờ đợi cơ hội, hãy tự tạo ra nó.", category: "Hành động & Ước mơ" },
  { text: "Hành trình vạn dặm bắt đầu từ một bước chân.", category: "Hành động & Ước mơ" },
  { text: "Đầu tư vào bản thân là khoản đầu tư có lãi nhất.", category: "Hành động & Ước mơ" },
  { text: "Hãy bận rộn với việc cải thiện bản thân đến mức không còn thời gian để chỉ trích người khác.", category: "Hành động & Ước mơ" },
  { text: "Kỷ luật là cầu nối giữa mục tiêu và thành tựu.", category: "Hành động & Ước mơ" },
  { text: "Sự chuẩn bị cộng với cơ hội sẽ tạo nên may mắn.", category: "Hành động & Ước mơ" },
  { text: "Đừng sợ thất bại, hãy sợ việc không dám thử.", category: "Hành động & Ước mơ" },
  { text: "Mục tiêu lớn cần những hành động nhỏ và liên tục.", category: "Hành động & Ước mơ" },
  { text: "Hãy sống cuộc đời mà khi nhìn lại, bạn không phải hối tiếc.", category: "Hành động & Ước mơ" },
  { text: "Sáng tạo là khi trí thông minh được vui chơi.", category: "Hành động & Ước mơ" },
  { text: "Đừng chỉ mơ về thành công, hãy thức dậy và làm việc vì nó.", category: "Hành động & Ước mơ" },
  { text: "Thành công thường đến với những ai quá bận rộn để tìm kiếm nó.", category: "Hành động & Ước mơ" },
  { text: "Những gì bạn làm hôm nay sẽ quyết định ngày mai của bạn.", category: "Hành động & Ước mơ" },
  { text: "Đừng bao giờ từ bỏ giấc mơ chỉ vì thời gian để thực hiện nó quá dài.", category: "Hành động & Ước mơ" },
  { text: "Hãy làm việc cho đến khi tài khoản ngân hàng của bạn trông giống như một số điện thoại.", category: "Hành động & Ước mơ" },

  // Wisdom & Growth
  { text: "Học từ hôm qua, sống cho hôm nay, hy vọng cho ngày mai.", category: "Trí tuệ & Trưởng thành" },
  { text: "Kiến thức là sức mạnh, nhưng áp dụng nó mới là quyền năng.", category: "Trí tuệ & Trưởng thành" },
  { text: "Người hỏi là kẻ ngốc trong năm phút, người không hỏi là kẻ ngốc cả đời.", category: "Trí tuệ & Trưởng thành" },
  { text: "Sự trưởng thành không tính bằng tuổi tác, mà bằng những trải nghiệm.", category: "Trí tuệ & Trưởng thành" },
  { text: "Thất bại là người thầy nghiêm khắc nhưng tuyệt vời nhất.", category: "Trí tuệ & Trưởng thành" },
  { text: "Hãy khiêm tốn khi thành công và kiên cường khi thất bại.", category: "Trí tuệ & Trưởng thành" },
  { text: "Đọc một cuốn sách là sống thêm một cuộc đời.", category: "Trí tuệ & Trưởng thành" },
  { text: "Lắng nghe nhiều hơn nói để thấu hiểu thế giới.", category: "Trí tuệ & Trưởng thành" },
  { text: "Đừng sợ thay đổi, vì đó là cách để bạn lớn lên.", category: "Trí tuệ & Trưởng thành" },
  { text: "Sự thật đôi khi đau lòng nhưng nó giúp bạn tự do.", category: "Trí tuệ & Trưởng thành" },
  { text: "Hãy chọn bạn mà chơi, vì họ sẽ phản chiếu con người bạn.", category: "Trí tuệ & Trưởng thành" },
  { text: "Giữ cho tâm trí luôn cởi mở như một chiếc dù.", category: "Trí tuệ & Trưởng thành" },
  { text: "Đừng để cái tôi ngăn cản sự tiến bộ của bạn.", category: "Trí tuệ & Trưởng thành" },
  { text: "Mọi vấn đề đều có cách giải quyết, quan trọng là bạn nhìn nó ở góc độ nào.", category: "Trí tuệ & Trưởng thành" },
  { text: "Sự đơn giản là đỉnh cao của sự tinh tế.", category: "Trí tuệ & Trưởng thành" },
  { text: "Biết người là thông minh, biết mình là trí tuệ.", category: "Trí tuệ & Trưởng thành" },
  { text: "Đừng vội vàng, những thứ tốt đẹp cần thời gian để chín muồi.", category: "Trí tuệ & Trưởng thành" },
  { text: "Hãy là người giải quyết vấn đề, không phải người tạo ra nó.", category: "Trí tuệ & Trưởng thành" },
  { text: "Cuộc sống là một ngôi trường mà bạn không bao giờ tốt nghiệp.", category: "Trí tuệ & Trưởng thành" },
];
