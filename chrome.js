//Chrome Web Store API specific code to launch the package as a packaged Chrome Web App
chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('/index.html', {
        frame: 'none',
        bounds: {
            width: screen.availWidth,
            height: screen.availHeight,
            left: 0,
            top: 0
        },
        resizable: false
    });
});
