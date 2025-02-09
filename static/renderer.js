// Custom renderer for links and headings 
const renderer = {
  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

    if (depth == 1) {
      document.title = `_ocean: ${text}`;
    }

    return `
            <h${depth}>
              <a name="${escapedText}" class="anchor" href="${location.hash}#${escapedText}">
              ${text}
              </a>
            </h${depth}>`;
  },
  link({tokens, href}) {
    const text = this.parser.parseInline(tokens);
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
    return `<a name="${escapedText}" href="#${href}">${text}</a>`;
  },
  image({href, title, text}) {
    title = title || text;
    const hash = window.location.hash.slice(1, window.location.hash.length);
    base = hash.split('/');
    base = base.slice(0, base.length-1).join('/');
    href = `${base}/${href}`;
    return `<figure><img src="${href}" alt="${title}" /><figcaption>${text}</figcaption></figure>`
  }

};


function renderEl(elid, content){
  marked.use({ renderer });
  document.getElementById(elid).innerHTML = marked.parse(content);
}

function renderFi(target){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
       renderEl("content", xhttp.responseText);
    }
  };
  xhttp.open("GET", target, true);
  xhttp.send();
}

// intercept all the clicks!
function click_callback(e) {
  var e = window.e || e;

  if (e.target.tagName !== 'A')
      return;

  uri_components = e.target.href.split("#");
  if (uri_components[1] == "/"){
    renderFi("/README.md");
    location.hash = "";
  } else {
    renderFi(`${uri_components[0]}/${uri_components[1]}`);
    location.hash = e.target.hash;
  }
  e.preventDefault(); // Cancel the native event
  e.stopPropagation();// Don't bubble/capture the event any further
  return;
}

//window.addEventListener("hashchange", (event) => {alert(event);});
window.addEventListener("load", (event) => {
  if(!window.location.hash){
    renderFi("/README.md");
  } else {
    uri_components = window.location.href.split("#")
    renderFi(`${uri_components[0]}/${uri_components[1]}`);
  }
});

if (document.addEventListener) {
    document.addEventListener('click', click_callback, false);
} else {
    document.attachEvent('onclick', click_callback);
}