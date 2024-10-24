const messageInput = document.getElementById('message-input');
const messageContainer = document.getElementById('message-container');

// Send message when the button is clicked
document.getElementById('send-button').addEventListener('click', sendMessage);

// Poll the server every 2 seconds to fetch new messages
setInterval(fetchMessages, 2000);

function sendMessage() {
    const message = messageInput.value;
    if (message.trim() !== '') {
        appendMessage(`You: ${message}`, 'sent');
        messageInput.value = '';

        // Send message to the backend
        fetch('/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
    }
}

function appendMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    messageElement.innerHTML = `${message}<span class="time">${time}</span>`;
    messageContainer.appendChild(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function fetchMessages() {
    fetch('/get_messages')
        .then(response => response.json())
        .then(messages => {
            messageContainer.innerHTML = '';  // Clear existing messages
            messages.forEach((msg, idx) => {
                const type = idx % 2 === 0 ? 'received' : 'sent';
                appendMessage(msg, type);
            });
        });
}