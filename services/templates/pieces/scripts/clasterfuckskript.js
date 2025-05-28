//-========script хидера-========//
function initializeApp() {
    console.log("Initializing App...");
    initializeHeader();
    initializeTerminal();
    initializePopups();
    console.log("App Initialized!");
}
function initializeHeader() {
    const header = document.getElementById("header");
        if (!header) {
        console.error("Header not found!");
        return;
    }
    let headerAnim = null;
    let currentTop = -215;
    const targetShown = 0;
    const targetHidden = -215;
    const steps = [15, -10, 6, -4, 3, -2, 1, 0];

    // подключим глобальные вещи
    const buttons = {
      'btn-converters': 'popup-converters',
      'btn-editors': 'popup-editors',
      'btn-tools': 'popup-tools'
    };

    const popups = {
      'popup-converters': document.getElementById('popup-converters'),
      'popup-editors': document.getElementById('popup-editors'),
      'popup-tools': document.getElementById('popup-tools')
    };

    const buttonElems = {
      'btn-converters': document.getElementById('btn-converters'),
      'btn-editors': document.getElementById('btn-editors'),
      'btn-tools': document.getElementById('btn-tools')
    };

    // текущая активная кнопка
    let currentActive = null;

    function hideAllPopups() {
      Object.keys(buttons).forEach(btnId => {
        const popupId = buttons[btnId];
        const popup = popups[popupId];
        const button = buttonElems[btnId];

        // Прячем попап
        popup.style.top = "-700px";
        popup.style.opacity = "0";
        popup.style.visibility = "hidden";

        // Убираем визуальную активность
        button.classList.remove('hover-active');
      });

      currentActive = null;
    }

    function animateHeader(to) {
      clearInterval(headerAnim);
      let step = 0;

      headerAnim = setInterval(() => {
        const jerk = steps[step] || 0;
        const diff = (to - currentTop) * 0.3 + jerk;
        currentTop += diff;
        header.style.top = `${currentTop}px`;

        if (Math.abs(to - currentTop) < 1 || step >= steps.length) {
          clearInterval(headerAnim);
          currentTop = to;
          header.style.top = `${to}px`;

          // если хидер уехал вверх — прячем всё
          if (to === targetHidden) {
            hideAllPopups();
          }
        }

        step++;
      }, 30);
    }

    header.addEventListener("mouseenter", () => {
      animateHeader(targetShown);
    });

    header.addEventListener("mouseleave", () => {
      animateHeader(targetHidden);
    });
    console.log("Header initialized!");
}
//-========script хидера-========//

//-========script терминала-========//

function initializeTerminal() {
    let textblock = document.getElementById('textblock');
    if (!textblock) {
        console.error("Textblock not found!");
        return;
    }

let index = 0;
let currentText = "";
let typingSpeed = 15; // стандартная скорость
let currentColor = "#28d93c"; // стандартный цвет текста
let typingTimeout = null; // хранение id таймера

function typeText(newText) {
    if (typingTimeout) {
    clearTimeout(typingTimeout); // ОЧИЩАЕМ старый таймер
    typingTimeout = null;
  }
  textblock.innerHTML = "";
  index = 0;
  currentText = newText;
  typingSpeed = 15;
  currentColor = "#28d93c"; // стандартный цвет текста

  function step() {
    if (index < currentText.length) {
      if (currentText.substring(index, index + 2) === "{{") {
        // нашли {{
        const end = currentText.indexOf("}}", index);
        if (end !== -1) {
          const command = currentText.substring(index + 2, end).trim();
          
          if (command.startsWith("typing speed:")) {
            const speed = parseInt(command.split(":")[1]);
            if (!isNaN(speed)) typingSpeed = speed;
          } else if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
            currentColor = command;
          }
          
          index = end + 2; // пропускаем всё до }}
          setTimeout(step, typingSpeed);
          return;
        }
      }

      if (currentText.charAt(index) === "\n") {
        textblock.innerHTML += "<br>";
      } else {
        textblock.innerHTML += `<span style="color:${currentColor};">${currentText.charAt(index)}</span>`;
      }

      index++;
            typingTimeout = setTimeout(step, typingSpeed); // сохраняем таймер в переменную
    }
  }

  step();
}

 
    textblock = document.getElementById('textblock');

    const introText = "sys> press any button for more info";
    const aboutText = "sys> SwitzerTool is a massive web multi-tool that was created to make any computer user, web user live easier. It combines majority of tools that regular user will need and tools that will be such an air-breath for advanced users.";
    const helpText = "sys> To start using SwitzerTool, simply open Control board on Top by hover on yellow-black stripe and choose desired category.";
    const whyText = "sys> WHY??? SwitzerTool built and design for users to of all kinds to achive their goals. its a regular converter that built to drain money from user's pocket. SWITZERTOOL is more than just a converter, it is a tool that combinmes utilities and editors, it's a real swiss knife for web users.";
    const securityText = "sys> Security is our top priority. SwitzerTool does not store any user data or files. All operations are performed locally in your browser, ensuring your privacy and security. Only You have access to your files and data, and we do not track or log any user activity. You are the one who responcible for your data.";
    const funcsText = 'sys> SwitzerTool offers\n1: converting services from file to file\n2: editing services for images, audio, video and documents\n3: utilities for web users like QR code generator, text to speech and more\n4: and many more features are {{typing speed:90}} coming soon!';
    typeText(introText);

    document.getElementById("about").addEventListener("click", () => {
      typeText(aboutText);
    });
    document.getElementById("help").addEventListener("click", () => {
      typeText(helpText);
    });
    document.getElementById("why").addEventListener("click", () => {
      typeText(whyText);
    });
    document.getElementById("security").addEventListener("click", () => {
      typeText(securityText);
    }); 
    document.getElementById("funcs").addEventListener("click", () => {
      typeText("sys> SwitzerTool offers\n{{typing speed:70}}sys>{{typing speed: 15}} converting services from file to file\n{{typing speed:70}}sys>{{typing speed: 15}} editing services for images, audio, video and documents\n{{typing speed:70}}sys>{{typing speed: 15}} utilities for web users like QR code generator, text to speech and more\n{{typing speed:70}}sys>{{typing speed: 15}} and many more features are {{ #ffffff }}{{typing speed:100}} coming soon!");
    });
    document.getElementById("story").addEventListener("click", () => {
      typeText("sys> The story of SwitzerTool began with a simple idea: to create a tool that would make life easier for both regular and advanced users. Inspired by the Swiss Army Knife, we wanted to combine multiple utilities and editors into one platform. After months of development and testing, we are proud to present SwitzerTool, a powerful web multi-tool designed to meet the needs of all users.");
    });
    // можно добавить еще кнопки, например:
    // document.getElementById("why").addEventListener("click", () => typeText("sys> Because it's awesome, bro."));


      console.log("Terminal initialized!");
}
//-========script терминала-========//  




//-========script попап-========//
function initializePopups() {
  const buttons = {
    'btn-converters': 'popup-converters',
    'btn-editors': 'popup-editors',
    'btn-tools': 'popup-tools'
  };

  const popups = {
    'popup-converters': document.getElementById('popup-converters'),
    'popup-editors': document.getElementById('popup-editors'),
    'popup-tools': document.getElementById('popup-tools')
  };

  const buttonElems = {
    'btn-converters': document.getElementById('btn-converters'),
    'btn-editors': document.getElementById('btn-editors'),
    'btn-tools': document.getElementById('btn-tools')
  };

  let currentActive = null;
  const popupPosition = "0px";
  const hiddenPosition = "-700px";

  function activatePopup(btnId) {
  Object.keys(buttons).forEach(id => {
    const popupId = buttons[id];
    const popup = popups[popupId];
    const button = buttonElems[id];

    if (id === btnId) {
      popup.style.top = "0px";
      popup.style.opacity = "1";
      popup.style.visibility = "visible";
      button.classList.add('hover-active');
    } else {
      popup.style.top = "-700px";
      popup.style.opacity = "0";
      popup.style.visibility = "hidden";
      button.classList.remove('hover-active');
    }
  });

  currentActive = btnId; // даже если уже активна — мы переустанавливаем
}


  Object.keys(buttonElems).forEach(btnId => {
    buttonElems[btnId].addEventListener("mouseenter", () => {
      activatePopup(btnId);
    });
  });

  // Инициализация первой панели по умолчанию


    console.log("Popups initialized!");
}
//-========script попап-========//
