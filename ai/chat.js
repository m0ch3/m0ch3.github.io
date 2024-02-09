var page_convo_id = null;
var model_name = null;
var user_id = "99ac9b103d432a014750e493fec70f8cbd7019c399bb890eb8553a4c0e74cc18";
document.addEventListener("DOMContentLoaded", async () => {
    if (!page_convo_id) {
        page_convo_id = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }();
    }
    let input = document.querySelector('#inputarea');
    let sendBtn = document.querySelector('.send-btn');
    let gptmodel = document.getElementsByName('gpt-model');
    input.addEventListener("input", e => {
        let new_height = null;
        while (input.offsetHeight != new_height) {
            new_height = input.offsetHeight;
            input.style.height = `${input.scrollHeight}px`;
        }
    });
    input.addEventListener("keyup", e => {
        if (e.ctrlKey && e.key === 'Enter') {
            sender();
        }
    });
    sendBtn.addEventListener("click", e => sender());
    for (let i = 0; i < gptmodel.length; i++) {
        gptmodel[i].addEventListener("change", e => {
            switch (e.target.value) {
                case "gpt-3.5-turbo":
                    chatInit("gpt-3.5-turbo");
                    break;
                case "gpt-3.5-turbo-16k":
                    chatInit("gpt-3.5-turbo-16k");
                    break;
                case "gpt-3.5-turbo-instruct":
                    completeInit("gpt-3.5-turbo-instruct");
                    break;
                case "image-256":
                    imageInit("256x256");
                    break;
                case "image-512":
                    imageInit("512x512");
                    break;
                case "image-1024":
                    imageInit("1024x1024");
                    break;
                default:
                    console.log(e.target.value);
            }
        });
    }
    gptmodel[0].dispatchEvent(new Event('change'));

    function chatInit(model) {
        let container = document.querySelector('.main');
        let input = document.querySelector('#inputarea');
        container.style.display = "";
        input.placeholder = "输入聊天信息，Enter换行，Ctrl+Enter快捷发送";
        model_name = model
    }

    function completeInit(model) {
        let container = document.querySelector('.main');
        let input = document.querySelector('#inputarea');
        container.style.display = "none";
        input.placeholder = "输入文本中必须包含[flag]标记，生成结果将在[flag]位置填充！";
        model_name = model
    }

    function imageInit(model) {
        let container = document.querySelector('.main');
        let input = document.querySelector('#inputarea');
        container.style.display = "";
        input.placeholder = "输入聊天信息，Enter换行，Ctrl+Enter快捷发送";
        model_name = model
    }

    async function sender() {
        let gptmodel = document.getElementsByName('gpt-model');
        for (let i = 0; i < gptmodel.length; i++) {
            gptmodel[i].disabled = true;
        }
        switch (model_name) {
            case "gpt-3.5-turbo":
                await chat_sender();
                break;
            case "gpt-3.5-turbo-16k":
                await chat_sender();
                break;
            case "gpt-3.5-turbo-instruct":
                await complete_sender();
                break;
            case "256x256":
                await image_sender();
                break;
            case "512x512":
                await image_sender();
                break;
            case "1024x1024":
                await image_sender();
                break;
            default:
                console.log(model_name);
        }
    }

    async function chat_sender() {
        let input = document.querySelector('#inputarea');
        let container = document.querySelector('.main');
        let footer = document.querySelector('.footer');
        let loading = document.querySelector('.loading');
        let md = window.markdownit();
        //渲染界面函数
        function renderInfo(value, direction) {
            let parentNode = document.createElement('div');
            parentNode.className = direction === 'right' ? 'chat-container avatar-container' : 'chat-container robot-container';
            let img = document.createElement('img'); img.src = direction === 'right' ? '/localimage/config/avatar.png' : '/localimage/config/robot.png';
            img.classList.add('avatar');
            let childNode = document.createElement('div'); childNode.className = 'chat-txt';
            childNode.innerHTML = value;
            parentNode.appendChild(img);
            parentNode.appendChild(childNode);
            container.appendChild(parentNode);
            return childNode;
        }
        function modifyMessage(txtnode, message) {
            txtnode.innerHTML = message;
        }
        //数据的发送和获取
        let value = input.value.trim();
        if (!value) return;
        input.value = '';
        renderInfo(md.render(value), 'right');
        loading.style.display = "block";
        footer.style.display = "none";
        let txtnode = renderInfo("请稍候...", 'left');

        let request_data = {
            prompt: value,
            convo_id: page_convo_id,
            user_id: user_id,
            model: model_name
        };
        const controller = new AbortController();
        let response;
        try {
            response = await fetch("https://gpt.m0ch.top:20083/api/v2/stream_ask", {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'content-type': "application/json; charset=utf-8"
                },
                redirect: 'follow',
                body: JSON.stringify(request_data),
                signal: controller.signal
            });
        } catch (e) {
            modifyMessage(txtnode, md.render("网络故障:" + e.toString()));
            loading.style.display = "none";
            footer.style.display = "block";
            return;
        }
        if (response.status !== 200) {
            controller.abort();
            modifyMessage(txtnode, md.render("消息发送失败. StatusCode:" + response.status));
            loading.style.display = "none";
            footer.style.display = "block";
            return;
        }
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let reply = "";
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            console.log('Received: ' + value);
            if (value.indexOf("error_data:") != -1) {
                reply += value;
                modifyMessage(txtnode, md.render(reply));
                break;
            }
            else {
                reply += value;
                modifyMessage(txtnode, md.render(reply));
            }
        }
        console.log('Response fully received');
        loading.style.display = "none";
        footer.style.display = "block";
    }

    async function complete_sender() {
        let input = document.querySelector('#inputarea');
        let loading = document.querySelector('.loading');
        let md = window.markdownit();

        function concatMessage(prompt, message, suffix) {
            if (!message)
                message = "";
            let new_height = null;
            while (input.offsetHeight != new_height) {
                new_height = input.offsetHeight;
                input.style.height = `${input.scrollHeight}px`;
            }
            return prompt + message + suffix;
        }
        //数据的发送和获取
        let value = input.value.trim();
        if (!value.includes("[flag]")) {
            alert("内容中未找到[flag]标记!");
            return;
        }
        const prompt = value.split("[flag]")[0];
        const suffix = value.split("[flag]")[1];
        input.value = concatMessage(prompt, "", suffix);
        loading.style.display = "block";

        let request_data = {
            prompt: prompt,
            suffix: suffix,
            convo_id: page_convo_id,
            user_id: user_id,
            model: model_name
        };
        const controller = new AbortController();
        let response;
        try {
            response = await fetch("https://gpt.m0ch.top:20083/api/v2/stream_complete", {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'content-type': "application/json; charset=utf-8"
                },
                redirect: 'follow',
                body: JSON.stringify(request_data),
                signal: controller.signal
            });
        } catch (e) {
            alert("网络故障:" + e.toString());
            loading.style.display = "none";
            return;
        }
        if (response.status !== 200) {
            controller.abort();
            alert("消息发送失败. StatusCode:" + response.status);
            loading.style.display = "none";
            return;
        }
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let reply = "";
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            console.log('Received: ' + value);
            if (value.indexOf("error_data:") != -1) {
                reply += value + '\n\n发生错误，请重试。\n\n';
                input.value = concatMessage(prompt, reply, suffix);
                break;
            }
            else {
                reply += value;
                input.value = concatMessage(prompt, reply, suffix);
            }
        }
        console.log('Response fully received');
        loading.style.display = "none";
    }

    async function image_sender() {
        let input = document.querySelector('#inputarea');
        let container = document.querySelector('.main');
        let footer = document.querySelector('.footer');
        let loading = document.querySelector('.loading');
        let md = window.markdownit();
        //渲染界面函数
        function renderInfo(value, direction) {
            let parentNode = document.createElement('div');
            parentNode.className = direction === 'right' ? 'chat-container avatar-container' : 'chat-container robot-container';
            let img = document.createElement('img'); img.src = direction === 'right' ? '/localimage/config/avatar.png' : '/localimage/config/robot.png';
            img.classList.add('avatar');
            let childNode = document.createElement('div'); childNode.className = 'chat-txt';
            childNode.innerHTML = value;
            parentNode.appendChild(img);
            parentNode.appendChild(childNode);
            container.appendChild(parentNode);
            return childNode;
        }
        function modifyMessage(txtnode, message) {
            txtnode.innerHTML = message;
        }
        //数据的发送和获取
        let value = input.value.trim();
        if (!value) return;
        input.value = '';
        renderInfo(md.render(value), 'right');
        loading.style.display = "block";
        footer.style.display = "none";
        let txtnode = renderInfo("请稍候...", 'left');

        let request_data = {
            prompt: value,
            convo_id: page_convo_id,
            user_id: user_id,
            model: "dall-e-2",
            size: model_name,
            quality: "standard"
        };
        const controller = new AbortController();
        let response;
        try {
            response = await fetch("https://gpt.m0ch.top:20083/api/v2/image_generate", {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'content-type': "application/json; charset=utf-8"
                },
                redirect: 'follow',
                body: JSON.stringify(request_data),
                signal: controller.signal
            });
        } catch (e) {
            modifyMessage(txtnode, md.render("网络故障:" + e.toString()));
            loading.style.display = "none";
            footer.style.display = "block";
            return;
        }
        if (response.status !== 200) {
            controller.abort();
            modifyMessage(txtnode, md.render("消息发送失败. StatusCode:" + response.status));
            loading.style.display = "none";
            footer.style.display = "block";
            return;
        }
        const result = await response.json();
        if (!result.status){
            reply = result.data + '\n\n发生错误，请重试。';
            modifyMessage(txtnode, md.render(reply));
        }
        else {
            reply = "![image](data:image/png;base64," + result.data + ")";
            modifyMessage(txtnode, md.render(reply));
        }

        loading.style.display = "none";
        footer.style.display = "block";
    }
});