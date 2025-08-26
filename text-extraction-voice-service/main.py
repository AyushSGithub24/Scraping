# main.py
import pyttsx3
import sys

def generate_audio(text_to_speak, output_path):
    """
    Generates an audio file from text using pyttsx3.
    """
    try:
        # Initialize the TTS engine
        engine = pyttsx3.init()

        # --- You can customize properties here ---
        # Get details of all available voices
        # voices = engine.getProperty('voices')
        # engine.setProperty('voice', voices[1].id) # Example: Set to the second voice

        engine.setProperty('rate', 160)  # Speed of speech (words per minute)
        engine.setProperty('volume', 0.9) # Volume (0.0 to 1.0)
        # -----------------------------------------

        # Save the speech to a file
        engine.save_to_file(text_to_speak, output_path)

        # Wait for the file to be saved
        engine.runAndWait()
        
        print(f"Successfully generated audio at {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # The script expects exactly two arguments from the command line
    if len(sys.argv) != 3:
        print("Usage: python main.py \"<text_to_speak>\" \"<output_path>\"", file=sys.stderr)
        sys.exit(1)

    text_input = sys.argv[1]
    output_file_path = sys.argv[2]
    
    generate_audio(text_input, output_file_path)