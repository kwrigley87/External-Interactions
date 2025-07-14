# Genesys Cloud Dummy Interaction Creator

This is a static HTML app hosted via GitHub Pages to help you create dummy email interactions and evaluations for testing purposes.

## Features

- Authenticate using Genesys Cloud OAuth
- Select active agents and queues
- Input an external reference
- (Optional) Assign a published evaluation form
- Automatically disconnects the interaction after creation

## Tech Stack

- HTML / JavaScript
- Genesys Cloud Platform API
- Hosted via GitHub Pages

## Setup

1. Clone or fork this repo
2. Update your Genesys Cloud OAuth app to include:
   - Grant Type: Implicit
   - Redirect URI: `https://<your-github-username>.github.io/<repo-name>/`
3. Replace the `CLIENT_ID` in `script.js`
4. Commit and push to trigger GitHub Pages

## Notes

- You must have access to Genesys Cloud and correct permissions
- Evaluation forms must be **published** to be used
