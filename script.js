const clientId = 'YOUR_CLIENT_ID'; // Replace this in a secure way (not embedded if public)
const redirectUri = window.location.href;
const region = 'mypurecloud.ie';

const platformClient = window['platformClient'];
const client = platformClient.ApiClient.instance;
client.setEnvironment(region);

let conversationsApi = new platformClient.ConversationsApi();
let usersApi = new platformClient.UsersApi();

let currentUser = null;

function log(message) {
  document.getElementById('output').innerText += `\n${message}`;
}

function populateAgentDropdown(users) {
  const select = document.getElementById('agentSelect');
  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.text = user.name;
    select.appendChild(option);
  });
}

function getAgentsInDivision(divisionId) {
  return usersApi.getUsers({ divisionId })
    .then(data => populateAgentDropdown(data.entities))
    .catch(e => log('Error loading agents: ' + e.message));
}

function createProxyInteraction(queueId, link, agentId) {
  const emailData = {
    queueId: queueId,
    provider: 'QualityForm',
    priority: 0,
    direction: 'INBOUND',
    fromName: 'External Work',
    attributes: {
      'External Link': link
    }
  };

  conversationsApi.postConversationsEmails(emailData)
    .then(response => {
      const convoId = response.id;
      log(`Created interaction: ${convoId}`);

      return conversationsApi.getConversation(convoId).then(convo => {
        const participantId = convo.participants[1].id;
        return conversationsApi.postConversationsEmailParticipantReplace(convoId, participantId, { userId: agentId })
          .then(() => {
            log('Agent assigned. Disconnecting...');
            return conversationsApi.patchConversationEmail(convoId, { state: 'disconnected' });
          })
          .then(() => log('Conversation completed and disconnected.'));
      });
    })
    .catch(e => log('Error: ' + e.message));
}

function init() {
  client.loginImplicitGrant(clientId, redirectUri)
    .then(() => usersApi.getUsersMe())
    .then(me => {
      currentUser = me;
      log(`Authenticated as ${me.name}`);
      return getAgentsInDivision(me.division.id);
    })
    .catch(e => log('Login failed: ' + e.message));

  document.getElementById('generateBtn').addEventListener('click', () => {
    const queueId = document.getElementById('queueId').value;
    const link = document.getElementById('externalRef').value;
    const agentId = document.getElementById('agentSelect').value;

    if (!queueId || !link || !agentId) {
      alert('Please complete all fields');
      return;
    }

    createProxyInteraction(queueId, link, agentId);
  });
}

window.addEventListener('load', init);
