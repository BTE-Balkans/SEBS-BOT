namespace DifficultyEmoji {
    const emojis : string[] = ['🐣', '🎓', '🥉',  '🥈', '🎖️']

    export function get(difficulty: number) {
        return emojis[difficulty - 1]
    }
}

export default DifficultyEmoji