import fs from "fs";
import path from "path";

export function filePrep(){
    if(!fs.existsSync(  path.join(__dirname,"../../../data/contestData.json")  )  )
    {
        console.log("No Contest Data file found, creating from template.");
        fs.copyFileSync(  path.join(__dirname,"../../../data/templates/contestData.template.json"),  path.join(__dirname,"../../../data/contestData.json")  );
    }
    if(!fs.existsSync(  path.join(__dirname,"../../../secret/auth.json")  )  )
    {
        console.log("No bot authorization token file found, creating from template. \nSetup Authorzation token in /secret/auth.json and restart!");
        fs.copyFileSync(  path.join(__dirname,"../../../data/templates/auth.template.json"),  path.join(__dirname,"../../../secret/auth.json")  );
    }
    return;
}