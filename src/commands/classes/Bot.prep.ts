import fs from "fs";
import path from "path";

export function filePrep(){
    if(!fs.existsSync(  path.join(__dirname,"../../../data/contestData.json")  )  )
    {
        fs.copyFileSync(  path.join(__dirname,"../../../templates/contestData.template.json"),  path.join(__dirname,"../../../data/contestData.json")  );
    }
    if(!fs.existsSync(  path.join(__dirname,"../../../data/auth.json")  )  )
    {
        fs.copyFileSync(  path.join(__dirname,"../../../templates/auth.template.json"),  path.join(__dirname,"../../../secret/auth.json")  );
        console.error("Setup auth tokens!");
    }
}