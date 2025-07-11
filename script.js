const CLIENT_ID = '8e243c51-4a4f-49e9-9f7e-2c8333f02a06';
const REDIRECT_URI = window.location.href.split('#')[0];
const REGION = 'apps.usw2.pure.cloud.com'; // Change if you're using another region
const SCOPES = [
  'conversations',
  'conversation:read',
  'users:readonly',
  'routing:readonly',
  'quality'
].join(' ');

const AUTH_URL = `https://login.${REGION}/oauth/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;

const token = getTokenFromHash();

if (token) {
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  init();
} else {
  document.getElementById('loginBtn').onclick = () => {
    window.location.href = AUTH_URL;
  };
}

function getTokenFromHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

async function api(path, method = 'GET', body = null) {
  const res = await fetch(`https://api.${REGION}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

async function init() {
  const [users, queues, forms] = await Promise.all([
    api('/api/v2/users?state=active'),
    api('/api/v2/routing/queues'),
    api('/api/v2/quality/forms/evaluations')
  ]);

  const userSelect = document.getElementById('userSelect');
  users.entities.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    userSelect.appendChild(opt);
  });

  const queueSelect = document.getElementById('queueSelect');
  queues.entities.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.id;
    opt.textContent = q.name;
    queueSelect.appendChild(opt);
  });

  const formSelect = document.getElementById('formSelect');
  forms.entities.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    formSelect.appendChild(opt);
  });

  document.getElementById('createBtn').onclick = createInteraction;
}

async function createInteraction() {
  const queueId = document.getElementById('queueSelect').value;
  const userId = document.getElementById('userSelect').value;
  const externalRef = document.getElementById('externalRef').value;
  const formId = document.getElementById('formSelect').value;

  const convo = await api('/api/v2/conversations/emails', 'POST', {
    queueId,
    toAddress: 'dummy@example.com',
    fromAddress: 'test@example.com',
    subject: 'Dummy Email',
    direction: 'outbound'
  });

  const convoDetails = await api(`/api/v2/conversations/${convo.id}`);
  const participant = convoDetails.participants.find(p => p.purpose === 'agent');

  await api(`/api/v2/conversations/emails/${convo.id}/participants/${participant.id}/replace`, 'POST', {
    userId
  });

  await api(`/api/v2/conversations/emails/${convo.id}`, 'PATCH', {
    externalTag: externalRef
  });

  await api('/api/v2/quality/evaluations', 'POST', {
    conversationId: convo.id,
    agentId: userId,
    evaluatorId: userId, // assuming self-evaluation for now
    formId
  });

  alert('Dummy interaction and evaluation created!');
}
