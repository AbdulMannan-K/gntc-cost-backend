import multer from "multer";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import https from 'https'
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import admin from "firebase-admin";
import serviceAccount from "./pk.json" assert { type: "json" };
import {getAuth} from "firebase-admin/auth";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let privateKey  = fs.readFileSync('key.pkey', 'utf8');
let certificate = fs.readFileSync('cert.cer', 'utf8');
let credentials = {key: privateKey, cert: certificate};



const DIR = './public/';

const app = express();
let httpsServer = https.createServer(credentials, app);

const port = process.env.PORT || 8005;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cors());
app.use('/public', express.static('public'));

httpsServer.listen(port,'0.0.0.0',() => {
  console.log('Connected to port ' + port)
})
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const client = req.params.client;
    const clientDir = `./public/${client}`;
    fs.mkdirSync(clientDir, { recursive: true });
    cb(null, clientDir);
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(' ').join('-');
    cb(null, uuidv4() + '-' + fileName)
  }
});

let upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  }
});

app.delete('/:imagename/:client',function (req, res) {
  let message = "Error! in image upload.";
  console.log('image name : ' ,req.params.imagename)
  console.log('client name : ' ,req.params.client)
  if (!req.params.imagename) {
    console.log("No file received");
    message = "Error! in image delete.";
    return res.status(500).json('error in delete');

  } else {
    console.log('file received');
    console.log(req.params.imagename);
    try {
      fs.unlinkSync(DIR+'/'+req.params.client+'/'+req.params.imagename);
      console.log('successfully deleted /tmp/hello');
      return res.status(200).send('Successfully! Image has been Deleted');
    } catch (err) {
      // handle the error
      return res.status(400).send(err);
    }

  }

});

app.post('/:client', upload.single('image'), async (req, res, next) => {
  const client = req.params.client;
  console.log(client)
  const url = req.protocol + '://' + req.get('host');
  const imageUrl = `${url}/public/${client}/${req.file.filename}`;
  res.send(imageUrl);
  // let client = (req.body.client);
  // console.log(client);
  // console.log(url + '/public/' + req.file.filename)
  // res.send(url + '/public/' + req.file.filename);
})

app.delete('/deleteUser/:uid',async function (req, res) {
  const uid = req.params.uid;
  await getAuth().deleteUser(uid).then().catch(err => console.log(err))
})