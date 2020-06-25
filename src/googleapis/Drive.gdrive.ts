import { google, drive_v3 } from 'googleapis';
import { Observable, Observer } from 'rxjs';
import { ReturnEnvelope } from '../exports';
import { ContestFile } from '../commands/classes/exports';

import shorturl from 'shorturl';
import DriveFile from './File.gdrive';

/**
 * All functions to interface with GDrive
 */
export default class Drive {
    
    constructor() {}

    /**
     * List files from a path in Google Drive
     *  Obs errors:
     *      API_ERROR - The API has returned an error
     * @param auth The auth object recieved from OAuth.gdrive.ts { Authorize$ }
     * @param fileID The ID of the folder to list from *can be found the link to the folder*
     * 
     */
    public list(auth, fileID: string): Observable<ReturnEnvelope> {
        return new Observable((obs: Observer<ReturnEnvelope>) => {
            const drive = google.drive({version:"v3", auth});

            // Call list function from drive api
            drive.files.list({
                fields: 'nextPageToken, files(id, name, webContentLink)',
                q: `'${fileID}' in parents`
            }, (err, res) => {
                if (err) {
                    obs.error({message: 'The API returned an error', data: err});
                    obs.complete();
                    return;
                }

                const files = res.data.files;
                if (files.length) {
                    console.log('Files: ');
                    
                    let fileGroup: {[key: string]: ContestFile} = {};
                    let promiseList = [];
                    files.map((file) => {
                        let f = new DriveFile(file.id, file.name, file.webContentLink);
                        fileGroup[f.id] = f;
                        // shorturl()
                        // TinyURL.shorten(f.webContentLink, function (link) {
                        //     console.log('Second: ', fileGroup[f.id]);
                        //     fileGroup[f.id].shortlink = link;
                        // });

                        console.log(`${f.name} (${f.id}) {${f.webContentLink}}\n`);
                    });

                    console.log('First: ', fileGroup);
                    
                    obs.next({
                        data: fileGroup
                    });
                    obs.complete();
                } else {
                    obs.next({
                        message: "No files found",
                        data: []
                    });
                    obs.complete();
                }
            });
        });
    }
}