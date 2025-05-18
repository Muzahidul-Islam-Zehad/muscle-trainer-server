require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
// const dayjs = require("dayjs");
// const customParseFormat = require('dayjs/plugin/customParseFormat');
// dayjs.extend(customParseFormat);

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

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

app.post('/add-personal-info', async (req, res) => {
    const { email, gender, birth_date, weight_kg, height_cm, bmi, timezoneId } = req.body;

    try {
        // Check if email already exists in either DB
        const [check1, check2] = await Promise.all([
            supabase1.from('personal_info').select('email').eq('email', email).maybeSingle(),
            supabase2.from('personal_info').select('email').eq('email', email).maybeSingle()
        ]);

        if (check1.data || check2.data) {
            console.log('Personal info already exists');
            return res.status(200).json({ message: 'Personal info already exists' });
        }

        // Validate birth date
        // const dob = dayjs(birthDate, 'D-M-YYYY');
        // if (!dob.isValid()) {
        //     return res.status(400).json({ message: 'Invalid birthDate format. Use D-M-YYYY' });
        // }

        const personalInfo = {
            email,
            gender,
            birth_date,
            weight_kg,
            height_cm,
            bmi
        };

        // Determine which DB to insert based on timezone
        const db = (timezoneId?.trim().toLowerCase() === 'asia/dhaka') ? supabase1 : supabase2;

        const { error } = await db.from('personal_info').insert(personalInfo);

        if (error) {
            console.error('Insert error:', error);
            return res.status(500).json({ message: 'Insert failed', error: error.message });
        }

        console.log('Personal info added to the database');
        return res.status(201).json({ message: 'Personal info added successfully' });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});



// get personal info based on email
app.get('/personal-info', async (req, res) => {
    const { email } = req.query;

    try {
        const [data1, data2] = await Promise.all([
            supabase1.from('personal_info').select('*').eq('email', email).maybeSingle(),
            supabase2.from('personal_info').select('*').eq('email', email).maybeSingle()
        ]);

        const data = data1.data || data2.data;

        if (data) {
            console.log('Fetched personal info:', data);

            return res.status(200).json(data);
        } else {
            return res.status(404).json({ message: 'Personal info not found' });
        }
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
