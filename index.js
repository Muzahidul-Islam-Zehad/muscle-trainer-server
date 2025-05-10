require('dotenv').config();
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
    const { userName, email, createdAt } = req.body;

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
        created_at: new Date().toISOString()
    };

    let insertResult;

    console.log("Timezone:",createdAt);


    if (createdAt?.trim().toLowerCase() === 'asia/dhaka') {
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



app.get('/', async (req, res) => {
    res.send('Hello from the server!');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
