const API_BASE = "https://sentimentalanalyser-production.up.railway.app/";
let communityPosts = [];

// 🧹 Replace negative/abusive words with ❤️
function sanitizeText(input) {
    const badWords = [
        "hate", "worthless", "useless", "stupid", "idiot", "kill",
        "suicide", "hopeless", "depressed", "sad", "die",
        "fuck", "shit", "bitch", "bastard", "asshole"
    ];
    let filtered = input;
    for (const word of badWords) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        filtered = filtered.replace(regex, "❤️");
    }
    return filtered;
}

// 💬 Add comment under a post
async function addComment(postId) {
    const input = document.getElementById(`comment-${postId}`);
    let comment = input.value.trim();
    if (!comment) return alert("Please write a comment!");
    comment = sanitizeText(comment);
    await fetch(`${API_BASE}/community/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, timestamp: new Date().toLocaleString() })
    });
    input.value = "";
    loadPosts(); // Refresh everything
}

// 📜 Load all posts (with comments)
async function loadPosts() {
    const res = await fetch(`${API_BASE}/community`);
    communityPosts = await res.json();
    renderPosts();
}

// 🧱 Render all posts + comments
function renderPosts() {
    const container = document.getElementById("postsContainer");
    if (!communityPosts.length) {
        container.innerHTML = `<p style="color:#aaa;">No journals yet. Be the first to share 🌷</p>`;
        return;
    }

    container.innerHTML = "";
    communityPosts.forEach(post => {
        const div = document.createElement("div");
        div.className = "post";

        const commentsHTML = post.comments.length
            ? post.comments.map(c => `
              <div class="comment">
                <p>${c.comment}</p>
                <small style="color:#777;">🕒 ${c.timestamp}</small>
              </div>
            `).join("")
            : `<p style="color:#777;">No comments yet. Be kind and start the conversation 🌸</p>`;

        div.innerHTML = `
          <p style="font-size:16px;">${post.text}</p>
          <p style="color:#777; font-size:13px;">🕒 ${post.timestamp} | 💭 ${post.comment_count} comments</p>
          <div>${commentsHTML}</div>
          <input class="comment-box" id="comment-${post.id}" placeholder="Write a kind comment..."/>
          <button onclick="addComment(${post.id})">Send 💬</button>
        `;
        container.appendChild(div);
    });
}

// 🚀 Initialize
loadPosts();