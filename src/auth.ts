import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';
import { config } from './config';

// The OAuth2 scopes we need
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

async function authenticate() {
  try {
    // Load client secrets from credentials.json
    const credentials = JSON.parse(fs.readFileSync(config.credentialsPath, 'utf-8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Generate the url that will be used for the consent dialog
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n🔐 Google Calendar Authentication\n');
    console.log('Authorize this app by visiting this url:');
    console.log('\n' + authUrl + '\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Store the token to disk for later program executions
        fs.writeFileSync(config.tokenPath, JSON.stringify(tokens));
        console.log('\n✅ Token stored to', config.tokenPath);
        console.log('\nYou can now run the application with: npm start\n');
      } catch (err) {
        console.error('\n❌ Error retrieving access token:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('\n❌ Error reading credentials file:', error);
    console.error('\nMake sure you have placed credentials.json in the project root.');
    console.error('See README.md for instructions on how to obtain credentials.json\n');
    process.exit(1);
  }
}

authenticate();
