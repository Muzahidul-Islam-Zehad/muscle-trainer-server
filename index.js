require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const dayjs = require("dayjs");
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

const supabase1 = createClient(process.env.SUPABASE1_URL, process.env.SUPABASE1_KEY);
const supabase2 = createClient(process.env.SUPABASE2_URL, process.env.SUPABASE2_KEY);

// Example GET API supabase1
app.get('/users1', async (req, res) => {
    const { data, error } = await supabase1.from('users').select('*');
    if (error) return res.status(500).json({ error });
    res.send(data);
});

// Example GET API supabase2
app.get('/users2', async (req, res) => {
    const { data, error } = await supabase2.from('users').select('*');
    if (error) return res.status(500).json({ error });
    res.send(data);
});

//add-user based on location

app.post('/add-personal-info', async (req, res) => {
    const { email, gender, birthDate, weight, height, bmi } = req.body;
    console.log(birthDate);

    try {
        // Check if email exists in either database
        const existsInDB1 = await supabase1.from('personal_info').select('email').eq('email', email).single();
        const existsInDB2 = await supabase2.from('personal_info').select('email').eq('email', email).single();

        if (existsInDB1.data || existsInDB2.data) {
            console.log('Personal info already exists');
            return res.status(200).json({ message: 'Personal info already exists' });
        }

        // Parse birthDate and calculate age
        const dob = dayjs(birthDate, 'DD-MM-YYYY');
        if (!dob.isValid()) {
            console.log('Invalid birthDate format');
            return res.status(400).json({ message: 'Invalid birthDate format. Use dd-MM-yyyy' });
        }

        const age = dayjs().diff(dob, 'year');
        const personalInfo = { email, gender, birthDate, weight, height, bmi };

        // Insert based on age
        const db = age <= 40 ? supabase1 : supabase2;
        const { error } = await db.from('personal_info').insert(personalInfo);

        if (error) {
            console.error('Insert error:', error);
            return res.status(500).json({ message: 'Insert failed', error: error.message });
        }
        console.log('Personal info added to the database');
        return res.status(201).json({ message: `Personal info added. Age: ${age}` });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});


app.get('/', async (req, res) => {
    res.send('Hello from the server!');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
