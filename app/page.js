"use client"
import { useState, useEffect } from "react";
import { Box, Stack, Button, TextField, useMediaQuery, useTheme } from "@mui/material";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  // State to hold conversation messages
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [conversationStarted, setConversationStarted] = useState(false); // Track if conversation has started

  // Function to start a new conversation
  const startNewConversation = () => {
    const initialMessages = [
      {
        role: "assistant",
        content: "Hi, I am the Rate My Professor support assistant for MVSU. How can I help you today?",
      },
    ];
    setMessages(initialMessages);
    setConversationStarted(true);
    localStorage.setItem("messages", JSON.stringify(initialMessages));
  };

  useEffect(() => {
    const storedMessages = localStorage.getItem("messages");
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
      setConversationStarted(true); // Mark conversation as started
    } else {
      setMessages([]); // No conversation started
      setConversationStarted(false); // Conversation not started yet
    }
  }, []);

  // Function to send message
  const sendMessage = async () => {
    if (message.trim() === "") return; // Prevent sending empty messages

    const updatedMessages = [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ];
    setMessages(updatedMessages);
    setMessage("");
    
    localStorage.setItem("messages", JSON.stringify(updatedMessages));

    const response = fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...updatedMessages, { role: 'user', content: message }])
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = '';
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];

          localStorage.setItem("messages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });

        return reader.read().then(processText);
      });
    });
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box 
      width="100vw" 
      height="100vh" 
      display="flex" 
      justifyContent="center" 
      alignItems="center"
      sx={{
        backgroundImage: 'valley.jpg', // Add your background image path here
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Box 
        width="100vw" 
        height="100vh" 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center"
        padding={isMobile ? 1 : 3}>
          <Stack 
            direction="column"
            width={isMobile ? "100%" : "500px"}
            height={isMobile ? "100%" : "700px"}
            border="1px solid black"
            padding={isMobile ? 1 : 2}
            spacing={isMobile ? 1 : 3}>
              <Stack 
                direction="row"
                justifyContent="space-between">
                <Button variant="outlined" onClick={startNewConversation}>
                  New Chat
                </Button>
              </Stack>
              <Stack 
                direction="column"
                spacing={2}
                flexGrow={1}
                overflow={"auto"}
                maxHeight={"100%"}>
              {
                messages.map((message, index) => (
                  <Box 
                    key={index} 
                    display="flex"
                    justifyContent={
                      message.role === "assistant" ? "flex-start" : "flex-end"
                    }>
                      <Box 
                        bgcolor={
                          message.role === 'assistant' ? "primary.main": "secondary.main"
                          }
                          color="white"
                          borderRadius={16}
                          p={isMobile ? 2 : 3}
                          maxWidth={isMobile ? "80%" : "70%"}>
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                      </Box>
                    </Box>
                ))
              }
            </Stack>
            <Stack 
              direction={"row"}
              spacing={2}
              mt={2}>
                <TextField
                  label="Message"
                  fullWidth
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                  }} />
                    <Button 
                      variant="contained"
                      onClick={sendMessage}
                      size={isMobile ? "small" : "medium"}
                      disabled={!conversationStarted}> {/* Disable button if conversation hasn't started */}
                        Send
                    </Button>
            </Stack>
          </Stack>
      </Box>
    </Box>
  );
}

