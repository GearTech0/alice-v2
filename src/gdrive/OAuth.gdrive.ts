import { google } from 'googleapis';
import readline from 'readline';
import path from 'path';
import fs from 'fs';
import { Observable, Observer, of } from 'rxjs';
import { map, concatAll, tap } from 'rxjs/operators';
import { ReturnEnvelope } from '../exports';
import { GoogleOAuthStatus } from './exports.googleapi';

const SCOPES = ['https://www.googleapis.com/auth/drive'];


class GoogleAuth {

    public TOKEN_PATH = path.join(__dirname, '../../secret/token.json');
    public status: GoogleOAuthStatus = 'unverified';
    private authClient;

    constructor() {
        this.authorization().subscribe({
            complete: () => {
                console.log('GoogleAPIs authorized');
            }
        })
    }

    public getAuthClient(authClient): any {
        return this.authClient;
    }

    public getStatus(): GoogleOAuthStatus {
        return this.status;
    }

    private authorization(): Observable<ReturnEnvelope> {
        return this.beginAuthorization()
            .pipe(
                map((env) => {
                    return this.authorize(env.data)
                        .pipe(
                            map((value: ReturnEnvelope) => {
                                if (value.status === 'unverified') {
                                    console.log('verifying')
                                    return this.getAccessToken(value.data);
                                }
                                return of(value);
                            }),
                            concatAll()
                        );
                }),
                concatAll()
            );
    }

    private beginAuthorization(): Observable<ReturnEnvelope> {
        return new Observable((obs: Observer<ReturnEnvelope>) => {
            fs.readFile(path.join(__dirname, '../../secret/credentials.json'), (err, content: Buffer) => {
                if (err) {
                    obs.error({message: 'Error loading client secret file', data: err});
                    obs.complete();
                    return;
                }

                console.log('loaded Google oAuth credentials')
                obs.next({data: JSON.parse(content.toString())});
                obs.complete();
            });
        });
    }

    private authorize(credentials): Observable<ReturnEnvelope> {
        return new Observable((obs: Observer<ReturnEnvelope>) => {
            const {client_secret, client_id, redirect_uris} = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret,redirect_uris[0]);
    
            fs.readFile(this.TOKEN_PATH, (err, token) => {
                if (err) {
                    obs.next({status: 'unverified', data: oAuth2Client});
                    obs.complete();
                    return;
                }

                oAuth2Client.setCredentials(JSON.parse(token.toString()));

                this.authClient = oAuth2Client; // Save client for Google Functions
                this.status = 'verified';
                console.log('saved oAuth client and verified');

                obs.next({status: 'verified', data: oAuth2Client});
                obs.complete();
            });
        });
    }

    private getAccessToken(oAuth2Client): Observable<ReturnEnvelope> {
        return new Observable((obs: Observer<ReturnEnvelope>) => {
            const authURL = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            });
    
            console.log('Authorize this app by visiting this url: ', authURL);
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question('Enter the code from that page here: ', (code) => {
                rl.close();
                oAuth2Client.getToken(code, (err, token) => {
                    if (err) {
                        obs.error({message: 'Error retrieving access token', data: err});
                        obs.complete();
                        return;
                    }
                    oAuth2Client.setCredentials(token);
    
                    fs.writeFile(this.TOKEN_PATH, JSON.stringify(token), (err) => {
                        if (err) {
                            obs.error({message: "Write file error", data: err});
                            obs.complete();
                            return;
                        }
                        
                        console.log(`Token stored to ${this.TOKEN_PATH}`);
                    });
                    obs.next({data: oAuth2Client});
                    obs.complete();
                });
            });
        });
    }
}

var GoogleAPIOAuth = new GoogleAuth();

export { GoogleAPIOAuth }