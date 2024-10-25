const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');

const port = 3300;  

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname));
app.use(express.static('public'));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const mongoURI = 'mongodb://localhost:27017/Virual_Learn';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.once('open', () => {
    console.log("Mongoose connection successful");
});

db.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

let gfs;
db.once('open', () => {
    gfs = Grid(db.db, mongoose.mongo);
    gfs.collection('pdfs'); 
});

// Set up GridFS storage for PDF uploads
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'pdfs'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });

// User schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email_id: { type: String, required: true, unique: true },
    pass_word: { type: String, required: true }
});

const Users = mongoose.model("User", userSchema);

// Group schema
const GroupSchema = new mongoose.Schema({
    groupname: {
        type: String,
        required: true,
        unique: true, 
    },
    leadername: {
        type: String,
        required: true, 
        unique: true,
    },
    join_code: {
        type: String, 
        required: true,
        unique: true, 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

});

const Group = mongoose.model('groups', GroupSchema);

// PDF schema
const pdfSchema = new mongoose.Schema({
    pdfFile: { type: String, required: true },
    title: { type: String, required: true }, 
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'groups' },
});
const PdfSchema = mongoose.model("PdfDetails", pdfSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'LogIN_&_SignIN.html'));
});

app.get('/home', async (req, res) => {
    try {
        const userId = req.session.userId; 
        const groups = await Group.find({ members: userId }); 
        res.render('home', { groups });
    } catch (error) {
        console.error("Error retrieving groups:", error);
        res.status(500).json({ error: 'Error Home page' });
    }
});

app.post('/register', async (req, res) => {
    const { name, email_id, pass_word } = req.body;
    if (!name || !email_id || !pass_word) {
        return res.status(400).send("All fields are required.");
    }
    try {
        const existingUser = await Users.findOne({ email_id });
        if (existingUser) {
            return res.status(400).send("User already exists. Please login.");
        }
        const user = new Users({ name, email_id, pass_word });
        await user.save();
        console.log("Registered User:", user);
        res.sendFile(path.join(__dirname, 'create_join.html'));
    } catch (error) {
        console.error("Error in registration:", error);
        res.status(500).send("Server Error");
    }
});

app.post('/login', async (req, res) => {
    const { email_id, pass_word } = req.body;

    if (!email_id || !pass_word) {
        return res.status(400).send("Email and password are required");
    }
    try {
        const user = await Users.findOne({ email_id });
        if (!user) {
            return res.status(400).send("User not found. Please register.");
        }

        if (user.pass_word === pass_word) {
            const groups = await Group.find({
                $or: [{ members: user._id }, { leadername: user.name }]
            });
            req.session.userId = user._id; 
            res.render('create_join', { groups });
        } else {
            res.status(400).send("Incorrect password. Please try again.");
        }
    } catch (error) {
        console.error("Error during login", error);
        res.status(500).send("Server error");
    }
});

app.post('/create_group', async (req, res) => {
    const { groupname, leadername, email_id } = req.body; 

    if (!groupname || !leadername || !email_id) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    let joinCode;
    let isUnique = false;
    while (!isUnique) {
        joinCode = Math.floor(100000 + Math.random() * 900000).toString();
        const existingGroup = await Group.findOne({ join_code: joinCode });
        if (!existingGroup) {
            isUnique = true;
        }
    }
    try {
        const existingGroup = await Group.findOne({ groupname });
        if (existingGroup) {
            return res.status(400).json({ error: 'Group name already exists' });
        }
        const leader = await Users.findOne({ name: leadername });
        if (!leader) {
            return res.status(404).json({ error: 'Leader not found' });
        }
        const newGroup = new Group({
            groupname,
            leadername: leader.name,  
            join_code: joinCode,
            members: [leader._id]  
        });
        await newGroup.save();  
        console.log("New Group ID:", newGroup._id);
        const updatedGroups = await Group.find({
            $or: [{ members: leader._id }, { leadername: leader.name }]
        });
        res.render('create_join', { groups: updatedGroups });
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ error: 'Error creating group' });
    }
});

app.post('/join-group', async (req, res) => {
    const { groupname, join_code, membername } = req.body;

    if (!groupname || !join_code || !membername) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        const user = await Users.findOne({ name: membername }); 
        const group = await Group.findOne({ groupname: groupname, join_code });  
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const isMember = group.members.includes(user._id); 
        if (!isMember) {
            group.members.push(user._id);  
            await group.save();
        }
        
        const updatedGroups = await Group.find({
            $or: [{ members: user._id }, { leadername: membername }] 
        })
        res.render('create_join', { groups: updatedGroups }); 
    } catch (error) {
        console.error("Error joining group:", error);
        res.status(500).json({ error: 'Error joining group' });
    }
});
app.post('/upload', upload.single('pdf'), async (req, res) => {
    const pdfFile = req.file.filename;
    const pdfTitle = req.body.pdfTitle;
    try {
        const pdfDetails = new PdfSchema({ pdfFile, title: pdfTitle });
        await pdfDetails.save();
        res.redirect('/pdfs'); 
    } catch (error) {
        res.status(500).json({ status: error.message });
    }
});


app.get('/pdfs', async (req, res) => {
    try {
        const pdfs = await PdfSchema.find();
        res.json(pdfs); 
    } catch (error) {
        console.error("Error retrieving PDFs:", error);
        res.status(500).json({ error: 'Error retrieving PDFs' });
    }
});

app.get('/pdf/:id', (req, res) => {
    const pdfId = req.params.id;

    gfs.files.findOne({ _id: mongoose.Types.ObjectId(pdfId) }, (err, file) => {
        if (err || !file) {
            console.error('File not found:', err);
            return res.status(404).json({ err: 'No file exists' });
        }
        const readstream = gfs.createReadStream(file.filename);
        res.set('Content-Type', 'application/pdf');
        readstream.pipe(res).on('error', (readErr) => {
            console.error('Error reading the stream:', readErr);
            res.status(500).json({ err: 'Error reading file' });
        });
    });
});


// app.delete('/pdf/:id', async (req, res) => {
//     try {
//         const pdf = await PdfSchema.findById(req.params.id); 
//         if (!pdf) return res.status(404).json({ success: false, message: 'PDF not found' });
//         gfs.remove({ _id: pdf._id, root: 'pdfs' }, (err) => {
//             if (err) {
//                 return res.status(404).json({ success: false, message: 'Error deleting file' });
//             }
//             PdfSchema.findByIdAndDelete(req.params.id, (err) => {
//                 if (err) return res.status(500).json({ success: false });
//                 res.json({ success: true });
//             });
//         });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

mongoose.set('debug', true);

