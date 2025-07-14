const CLIENT_ID = '8e243c51-4a4f-49e9-9f7e-2c8333f02a06';
const REDIRECT_URI = 'https://kwrigley87.github.io/PSTools/';
const REGION = 'usw2.pure.cloud';
const SCOPES = [
  'conversations',
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

  if (!res.ok) {
    const err = await res.text();
    console.error(`API error [${res.status}]:`, err);
    throw new Error(err);
  }

  return res.json();
}

async function fetchAll(path) {
  let results = [];
  let pageNumber = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await api(`${path}${path.includes('?') ? '&' : '?'}pageSize=100&pageNumber=${pageNumber}`);
    results = results.concat(response.entities);
    hasMore = !!response.nextUri;
    pageNumber++;
  }

  return results;
}

async function init() {
  const userMe = await api('/api/v2/users/me');
  window.loggedInUserId = userMe.id;
  document.getElementById('welcome').textContent = `Welcome, ${userMe.name}!`;

  const [users, queues, allForms] = await Promise.all([
    fetchAll('/api/v2/users?state=active'),
    fetchAll('/api/v2/routing/queues'),
    fetchAll('/api/v2/quality/forms/evaluations')
  ]);

  populateSelect('userSelect', users);
  populateSelect('queueSelect', queues);
  populateSelect('formSelect', allForms);

  document.getElementById('createBtn').onclick = createInteraction;
}

function populateSelect(id, items) {
  const select = document.getElementById(id);
  select.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  });
}

async function getLatestPublishedVersion(formId) {
  const versions = await fetchAll(`/api/v2/quality/forms/evaluations/${formId}/versions`);
  const published = versions
    .filter(v => v.published)
    .sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
  return published.length > 0 ? published[0].id : null;
}

async function createInteraction() {
  const queueId = document.getElementById('queueSelect').value;
  const userId = document.getElementById('userSelect').value;
  const externalRef = document.getElementById('externalRef').value;
  const selectedFormId = document.getElementById('formSelect').value;
  const includeEval = document.getElementById('includeEval').checked;
  const statusMsg = document.getElementById('statusMsg');
  statusMsg.textContent = 'Creating dummy interaction...';

  try {
    const convo = await api('/api/v2/conversations/emails', 'POST', {
      queueId: queueId,
      provider: 'QualityForm',
      priority: 0,
      direction: 'inbound',
      fromName: 'External Work',
      attributes: {
        'External Reference': externalRef
      }
    });

    if (!convo.id) throw new Error('Conversation creation failed');

    const convoDetails = await api(`/api/v2/conversations/${convo.id}`);
    const participant = convoDetails.participants[1];
    if (!participant) throw new Error('Second participant not found');

    await api(`/api/v2/conversations/emails/${convo.id}/participants/${participant.id}/replace`, 'POST', {
      userId: userId
    });

    if (includeEval && selectedFormId) {
      const publishedFormVersionId = await getLatestPublishedVersion(selectedFormId);
      if (!publishedFormVersionId) throw new Error('No published version found for selected form');

      await api(`/api/v2/quality/conversations/${convo.id}/evaluations`, 'POST', {
        evaluationForm: { id: publishedFormVersionId },
        evaluator: { id: window.loggedInUserId },
        agent: { id: userId }
      });
    }

    await api(`/api/v2/conversations/emails/${convo.id}`, 'PATCH', {
      state: 'disconnected'
    });

    statusMsg.textContent = '✅ Dummy interaction created and disconnected successfully!';
  } catch (error) {
    console.error('Error creating interaction:', error);
    statusMsg.textContent = '❌ Failed to create interaction. See console for details.';
  }
}

