const crypto = require('crypto');
const querystring = require('qs');

const vnpParams = { ...req.query }; // hoặc req.body nếu là POST

const secureHash = vnpParams['vnp_SecureHash'];
delete vnpParams['vnp_SecureHash'];
delete vnpParams['vnp_SecureHashType'];

// Bước 2: Sắp xếp các tham số
const sortedParams = {};
Object.keys(vnpParams).sort().forEach((key) => {
  sortedParams[key] = vnpParams[key];
});

// Bước 3: Tạo chuỗi query
const signData = querystring.stringify(sortedParams, { encode: false });

// Bước 4: Tạo HMAC SHA512
const secretKey = 'your_secret_key_here';
const hmac = crypto.createHmac("sha512", secretKey);
const calculatedHash = hmac.update(signData).digest("hex");

// Bước 5: So sánh
if (secureHash === calculatedHash) {
  console.log("✅ Chữ ký hợp lệ");
} else {
  console.log("❌ Chữ ký không hợp lệ");
}
