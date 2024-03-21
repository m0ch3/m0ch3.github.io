function decrypt() {
    const cryptoContainer = document.getElementById('crypto-container');
    const cryptoTxt = document.getElementById('crypto-txt');
    const passwordTxt = document.getElementById('password-txt');
    const pair = CryptoJS.SHA512(passwordTxt.value).toString();
    const key = CryptoJS.enc.Hex.parse(pair.slice(0, 32*2));
    const iv = CryptoJS.enc.Hex.parse(pair.slice(32*2, 48*2));
    const options = { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };

    const origin = cryptoTxt.getAttribute("data-origin"); //试探明文
    const now = cryptoTxt.getAttribute("data-now"); //试探密文
    if (CryptoJS.AES.decrypt(now, key, options).toString(CryptoJS.enc.Utf8) === origin) {
        cryptoContainer.outerHTML = CryptoJS.AES.decrypt(cryptoTxt.innerHTML, key, options).toString(CryptoJS.enc.Utf8);
    } else { alert("密码错误！"); }
}

document.addEventListener("DOMContentLoaded", () => {
    const passwordTxt = document.getElementById('password-txt');
    const submitButton = document.getElementById('submit-btn');
    submitButton.onclick = decrypt;
    passwordTxt.addEventListener('keyup', e => { if (e.key === 'Enter') { submitButton.click(); } });
});
