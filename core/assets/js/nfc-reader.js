document.getElementById("scanNFC").addEventListener("click", async () => {
    try {
        const reader = new NDEFReader();
        await reader.scan();
        reader.onreading = event => {
            const decoder = new TextDecoder();
            const cardId = decoder.decode(event.message.records[0].data);
            console.log("NFC Card ID:", cardId);
            alert("Card Detected: " + cardId);
        };
    } catch (error) {
        console.error("Error reading NFC:", error);
    }
});
