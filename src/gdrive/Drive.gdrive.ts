import OAuth from './OAuth.gdrive';
import { google } from 'googleapis';
import { Observable, Observer } from 'rxjs';
import { ReturnEnvelope } from '../exports';

export default class Drive {
    constructor() {
        
    }

    public list(auth): Observable<ReturnEnvelope> {
        return new Observable((obs: Observer<ReturnEnvelope>) => {
            const drive = google.drive({version:"v3", auth});
            console.log('here')
            drive.files.list({
                fields: 'nextPageToken, files(id, name, webContentLink)',
                q: "'1Q6VhNhjiWhDgXZOUCSvPFCut5HLLngvf' in parents"
            }, (err, res) => {
                if (err) {
                    console.error('The API returned an error: ', err);
                    obs.error({message: 'The API returned an error', data: err});
                    obs.complete();
                }
                console.log('there')
                const files = res.data.files;
                if (files.length) {
                    console.log('Files: ');
                    
                    let fileList = [];
                    files.map((file) => {
                        fileList.push({name: file.name, id: file.id, link: file.webContentLink});
                        console.log(`${file.name} (${file.id})`);
                    });

                    obs.next({
                        data: fileList
                    });
                    obs.complete();
                } else {
                    console.log('No files found');

                    obs.next({
                        message: "No files found"
                    })
                    obs.complete();
                }
            });
        });
    }
}