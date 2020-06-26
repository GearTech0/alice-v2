import { google } from 'googleapis';
import { Observable, Observer } from 'rxjs';
import { ReturnEnvelope } from '../exports';
import { ContestFile } from '../commands/classes/exports';

import shorturl from 'shorturl-2';
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
    public list(auth, fileID: string): Observable<Array<Observable<ReturnEnvelope>>> {
        return new Observable((obs: Observer<Array<Observable<ReturnEnvelope>>>) => {
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
                    let obsList = [];
                    console.log('Files: ');

                    files.map((file) => {
                        let f = new DriveFile(file.id, file.name, file.webContentLink);
                        console.log(`\t${f.id}`);
                        obsList.push(new Observable((_obs: Observer<ReturnEnvelope>) => {
                            shorturl(f.webContentLink, (result) => {
                                f.shortlink = result;

                                _obs.next({
                                    data: f
                                });
                                _obs.complete();
                            })
                        }));
                    });
                    
                    obs.next(obsList);
                    
                    obs.complete();
                } else {
                    obs.next([]);
                    obs.complete();
                }
            });
        });
    }
}