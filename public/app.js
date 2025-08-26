 const myinput = document.querySelector('#input');
    const suggestDiv = document.querySelector("#suggest");
    const div = document.querySelector("#body");
    const ul = document.createElement("ul");
    suggestDiv.appendChild(ul);
    const inpchapter = document.querySelector("#chapter_input");
    const generateBtn = document.querySelector("#generateBtn");
    const chapterFilterGroup = document.querySelector("#chapter-filter-group");
    const chapterSection = document.querySelector("#chapter-section");
    const generateSection = document.querySelector("#generate-section");
    let chapterURL="";
    // Add loading state to button
    function setButtonLoading(loading) {
      const btnText = generateBtn.querySelector('.btn-text');
      if (loading) {
        btnText.innerHTML = '<span class="loading"></span>Processing...';
        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.7';
      } else {
        btnText.textContent = 'Generate Video';
        generateBtn.disabled = false;
        generateBtn.style.opacity = '1';
      }
    }

    // Listen to comic search input with debounce
    let searchTimeout;
    myinput.addEventListener("input", async (e) => {
      let value = e.target.value.trim();
      
      clearTimeout(searchTimeout);
      
      if (!value) {
        ul.innerHTML = "";
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          let data = await callingAPI(value);
          if (data && data.data) {
            await showData(data);
          }
        } catch (error) {
          console.error('Search error:', error);
        }
      }, 300);
    });

    // Show search suggestions with improved UX
    async function showData(data) {
      ul.innerHTML = "";
      
      if (!data.data || data.data.length === 0) {
        const li = document.createElement("li");
        li.innerHTML = '<em>No comics found. Try a different search term.</em>';
        li.style.color = '#9ca3af';
        li.style.cursor = 'default';
        ul.appendChild(li);
        return;
      }

      for (let ob of data.data) {
        const li = document.createElement("li");
        li.innerText = ob.title;
        li.addEventListener("click", async () => {
          // Clear suggestions and update input
          ul.innerHTML = "";
          myinput.value = ob.title;
          
          // Show the chapter filter input and sections
          chapterFilterGroup.classList.remove("hidden");
          chapterSection.classList.remove("hidden");
          generateSection.classList.remove("hidden");
          
          // Show loading state
          div.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;"><div class="loading" style="display: inline-block; margin-right: 0.5rem;"></div>Loading chapters...</div>';
          
          try {
            chapterURL=ob.url;
            let url = ob.url + "ajax/chapters";
            let html = await htmlapi(url);
            div.innerHTML = html;
            
            // Wrap chapters into list with class
            let chapters = div.querySelectorAll(".wp-manga-chapter");
            if (chapters.length > 0) {
              let customUl = document.createElement("ul");
              customUl.classList.add("chapter-list");
              
              chapters.forEach(chap => {
                let li = document.createElement("li");
                let link = document.createElement("a");
                link.href = "#";
                link.innerText = chap.querySelector("a").innerText;
                link.addEventListener("click", (e) => {
                  e.preventDefault();
                  // Add selection logic here
                  document.querySelectorAll('.chapter-list li').forEach(item => {
                    item.style.borderColor = 'transparent';
                    item.style.background = '#f8fafc';
                  });
                  li.style.borderColor = '#667eea';
                  li.style.background = 'white';
                });
                li.appendChild(link);
                customUl.appendChild(li);
              });
              
              div.innerHTML = "";
              div.appendChild(customUl);
            } else {
              div.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">No chapters found for this comic.</div>';
            }
          } catch (error) {
            div.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">Error loading chapters. Please try again.</div>';
            console.error('Chapter loading error:', error);
          }
        });
        ul.appendChild(li);
      }
    }

    // Fetch HTML data for chapters with better error handling
    const htmlapi = async (url) => {
      try {
        const res = await fetch("http://localhost:3000/api/chapter", {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.text();
        return data;
      } catch (err) {
        console.error('API Error:', err);
        throw err;
      }
    };

    // Call search API with better error handling
    async function callingAPI(title) {
      try {
        const res = await fetch("http://localhost:3000/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title })
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        return data;
      } catch (err) {
        console.error('Search API Error:', err);
        throw err;
      }
    }

    // Filter chapters with improved search
    inpchapter.addEventListener("input", (e) => {
      let text = e.target.value.trim().toLowerCase();
      let chapters = document.querySelectorAll(".chapter-list li");
      
      chapters.forEach(li => {
        let chapText = li.innerText.toLowerCase();
        if (text === "" || chapText.includes(text)) {
          li.classList.remove("hidden");
        } else {
          li.classList.add("hidden");
        }
      });
    });

    // Generate video button click handler
    generateBtn.addEventListener("click", async () => {
      const selectedChapter = document.querySelector('.chapter-list li[style*="border-color: rgb(102, 126, 234)"] > a');
      
      if (!selectedChapter) {
        alert('Please select a chapter first!');
        return;
      }

      setButtonLoading(true);
      
      // Simulate video generation process
      try {
        const res=await fetch("http://localhost:3000/api/generate-video",{
            method:"POST",
            headers:{ "Content-Type": "application/json" },
            body:JSON.stringify({url:chapterURL,chapterNumber:selectedChapter.innerHTML})
        })
        alert('Video generation started! You will be notified when it\'s ready.');
      } catch (error) {
        alert('Error generating video. Please try again.');
        console.error('Generation error:', error);
      } finally {
        setButtonLoading(false);
      }
    });

    // Clear suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!suggestDiv.contains(e.target) && !myinput.contains(e.target)) {
        ul.innerHTML = "";
      }
    });