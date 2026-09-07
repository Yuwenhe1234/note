/**
 * [L1 交互接入层] ChatAdapter - 对话入口适配器
 * 演示「多端接入」拓展性：与 WebAdapter 并列的第二个接入端
 * 自然语言 → IntentRouter（L2）→ Agent 编排 → 对话式回复
 */

const ChatAdapter = (function () {

    function _msgHtml(role, text) {
        const isUser = role === 'user';
        return `
            <div class="chat-message ${isUser ? 'chat-message-user' : 'chat-message-agent'}">
                <div class="chat-bubble">${_format(text)}</div>
            </div>`;
    }

    /** 换行转 <br>，轻量转义 */
    function _format(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    function _scrollBottom() {
        const list = Utils.el('chatMessageList');
        if (list) list.scrollTop = list.scrollHeight;
    }

    function _append(role, text) {
        const list = Utils.el('chatMessageList');
        if (!list) return;
        list.insertAdjacentHTML('beforeend', _msgHtml(role, text));
        _scrollBottom();
    }

    /** 发送用户输入，经 Agent 处理后展示回复 */
    function send(text) {
        text = (text || '').trim();
        if (!text) return;

        _append('user', text);

        // Agent（L2）接管：意图识别 → 插件路由 → 流程编排
        const result = Agent.handleInput(text);
        _append('agent', result.reply);

        // 若意图含任务数据，提供跳转提示
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            _append('agent', '（提示：点击顶部「任务清单」可查看完整详情与操作）');
        }
    }

    function start() {
        const input = Utils.el('chatInput');
        const sendBtn = Utils.el('chatSendBtn');

        if (!input || !sendBtn) return;

        sendBtn.addEventListener('click', () => {
            send(input.value);
            input.value = '';
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input.value);
                input.value = '';
            }
        });

        // 欢迎语 + 历史记忆恢复
        _append('agent', '您好，我是任务备忘录 Agent。可以直接对我说：\n· 新建任务 学习 React 基础\n· 今日待办\n· 统计概览\n· 架构\n输入「帮助」查看全部指令。');

        Logger.info('[ChatAdapter] 对话入口就绪');
    }

    return { send, start };
})();
