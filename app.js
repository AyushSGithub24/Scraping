import express from "express";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
const app = express();
const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/search", async (req, res) => {
  try {
    // console.log("Incoming body:", req.body);
    const { title } = req.body;

    const params = new FormData();
    params.append("action", "wp-manga-search-manga");
    params.append("title", title);


    const response = await fetch("https://manhuatop.org/wp-admin/admin-ajax.php", {
      method: "POST",
      body: params
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Search request failed" });
  }
});


app.post("/api/chapter",async(req,res)=>{
    try{
        const {url}=req.body;
        const response = await fetch(url, {method: "POST"});
        const data = await response.text();
        res.send(data);
    }catch(err){
        console.error("Proxy error chapter:", err);
        res.status(500).json({ error: "chapter request failed" });
    }
})

app.post("/api/generate-video",async(req,res)=>{
    try{
        const {url,chapterNumber}=req.body;
        console.log(url+"\n"+chapterNumber);
        res.status(200).json({success:"Success"});
    }catch(err){ 
        console.error("Proxy error chapter:", err);
        res.status(500).json({ error: "chapter request failed" });
    }
})


app.listen(PORT, () => {
  console.log("Server Starting at port " + PORT);
});
