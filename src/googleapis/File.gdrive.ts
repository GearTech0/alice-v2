
/**
 * File object to representa GDrive file and its associated functions
 */
export default class DriveFile {
    public id: string;
    public name: string;
    public webContentLink: string;
    public shortlink: string;

    constructor(id: string, name: string, webContentLink: string) {
        this.id = id;
        this.name = name;
        this.webContentLink = webContentLink;
    }
}