require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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
app.post('/add-user', async (req, res) => {
    const { userName, email, location } = req.body;

    // Check if user exists in Supabase1
    const { data: bdUser } = await supabase1
        .from('users')
        .select()
        .eq('email', email)
        .single();

    // Check if user exists in Supabase2
    const { data: foreignUser } = await supabase2
        .from('users')
        .select()
        .eq('email', email)
        .single();

    if (bdUser || foreignUser) {
        return res.status(200).json({ message: 'User already exists' });
    }

    const userData = {
        userName,
        email,
        created_at: new Date().toISOString(),
        location
    };

    let insertResult;
    
    if (location?.trim().toLowerCase() === 'asia/dhaka') {
        insertResult = await supabase1.from('users').insert(userData);
    } else {
        insertResult = await supabase2.from('users').insert(userData);
    }
    if (insertResult.error) {
        console.error("Insert error:", insertResult.error);
        return res.status(500).json({ error: insertResult.error.message });
    }

    res.status(201).json({ message: 'User added successfully', data: insertResult.data });
    console.log(insertResult.data);
    console.log("User added successfully to the database:", insertResult.data);
});


//add-personal-info based on location
// const dayjs = require('dayjs');
// const customParseFormat = require('dayjs/plugin/customParseFormat');
// dayjs.extend(customParseFormat);

app.post('/add-personal-info', async (req, res) => {
    const { email, gender, birth_date, weight_kg, height_cm, bmi } = req.body;
    console.log(req.body);

    try {
        // STEP 1: Find which database the user email exists in (users table)
        const [user1, user2] = await Promise.all([
            supabase1.from('users').select('email').eq('email', email).maybeSingle(),
            supabase2.from('users').select('email').eq('email', email).maybeSingle()
        ]);

        let targetDB = null;

        if (user1.data) {
            targetDB = supabase1;
        } else if (user2.data) {
            targetDB = supabase2;
        } else {
            return res.status(404).json({ message: 'User not found in any database' });
        }

        // STEP 2: Check if personal info already exists in personal_info table
        const { data: existingInfo } = await targetDB
            .from('personal_info')
            .select('email')
            .eq('email', email)
            .maybeSingle();

        if (existingInfo) {
            console.log('Personal info already exists');
            return res.status(200).json({ message: 'Personal info already exists' });
        }

        // STEP 3: Insert personal info
        const personalInfo = {
            email,
            gender,
            birth_date,
            weight_kg,
            height_cm,
            bmi
        };

        const { error } = await targetDB.from('personal_info').insert(personalInfo);

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

// check if user info exists in any of the databases
app.get('/check-userInfo', async (req, res) => {
    const { email } = req.query;

    try {
        const [user1, user2] = await Promise.all([
            supabase1.from('personal_info').select('email').eq('email', email).maybeSingle(),
            supabase2.from('personal_info').select('email').eq('email', email).maybeSingle()
        ]);

        if (user1.data || user2.data) {
            console.log("user info exists");
            return res.status(200).json(true); // ✅ returning boolean
        } else {
            console.log("user info not found");
            return res.status(200).json(false); // ✅ still returning 200, but with `false`
        }
    } catch (err) {
        console.error("Server error:", err.message);
        return res.status(500).json(false); // Optional: handle server error as false or handle separately in frontend
    }
});

// get workout plan based on type
app.get('/workout_plan', async (req, res) => {
    const { type } = req.query;
    console.log(type);

    try {
        const { data, error } = await supabase1
            .from('workout_plans')
            .select('*')
            .eq('w_type', type);

        console.log("Fetched workout plan:", data);

        if (error) {
            console.error("Error fetching workout plan:", error);
            return res.status(500).json({ error });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Workout plan not found' });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error("Server error:", err.message);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});



app.get('/', async (req, res) => {
    res.send('Hello from the server!');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
