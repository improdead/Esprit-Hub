import { describe, it, expect } from 'vitest'
import { embeddingsTool } from './embeddings'

describe('OpenAI Embeddings Tool', () => {
  it('should generate embeddings for text', async () => {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment, skipping test')
      return
    }

    const params = {
      input: 'Hello, world! This is a test of vector embeddings.',
      model: 'text-embedding-3-small',
      encodingFormat: 'float',
      apiKey,
    }

    // Build the request
    const url = embeddingsTool.request.url(params)
    const headers = embeddingsTool.request.headers(params)
    const body = embeddingsTool.request.body(params)

    console.log('🚀 Testing OpenAI Embeddings API')
    console.log('📍 URL:', url)
    console.log('📝 Input text:', params.input)
    console.log('🤖 Model:', params.model)

    // Make the API call
    const response = await fetch(url, {
      method: embeddingsTool.request.method,
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`)
    }

    // Transform the response
    const result = await embeddingsTool.transformResponse(response)

    console.log('✅ Response received')
    console.log('📊 Number of embeddings:', result.output.embeddings.length)
    console.log('📏 Embedding dimension:', result.output.embeddings[0].length)
    console.log('🎯 Model used:', result.output.model)
    console.log('🔢 Token usage:', result.output.usage)

    // Assertions
    expect(result.success).toBe(true)
    expect(result.output.embeddings).toHaveLength(1)
    expect(result.output.embeddings[0]).toBeInstanceOf(Array)
    expect(result.output.embeddings[0].length).toBeGreaterThan(0)
    expect(result.output.model).toBeTruthy()
    expect(result.output.usage.prompt_tokens).toBeGreaterThan(0)
    expect(result.output.usage.total_tokens).toBeGreaterThan(0)

    // Verify embedding values are numbers
    const embedding = result.output.embeddings[0]
    expect(embedding.every((val: number) => typeof val === 'number')).toBe(true)

    console.log('✨ All assertions passed!')
  })

  it('should generate embeddings for multiple texts', async () => {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment, skipping test')
      return
    }

    const params = {
      input: ['First text to embed', 'Second text to embed', 'Third text to embed'],
      model: 'text-embedding-3-small',
      encodingFormat: 'float',
      apiKey,
    }

    const url = embeddingsTool.request.url(params)
    const headers = embeddingsTool.request.headers(params)
    const body = embeddingsTool.request.body(params)

    console.log('🚀 Testing OpenAI Embeddings API with multiple texts')
    console.log('📝 Number of input texts:', params.input.length)

    const response = await fetch(url, {
      method: embeddingsTool.request.method,
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const result = await embeddingsTool.transformResponse(response)

    console.log('✅ Response received')
    console.log('📊 Number of embeddings:', result.output.embeddings.length)

    // Assertions
    expect(result.success).toBe(true)
    expect(result.output.embeddings).toHaveLength(3)
    expect(result.output.embeddings[0]).toBeInstanceOf(Array)
    expect(result.output.embeddings[1]).toBeInstanceOf(Array)
    expect(result.output.embeddings[2]).toBeInstanceOf(Array)

    console.log('✨ All assertions passed!')
  })

  it('should calculate cosine similarity between embeddings', async () => {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment, skipping test')
      return
    }

    // Helper function to calculate cosine similarity
    const cosineSimilarity = (a: number[], b: number[]): number => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
      return dotProduct / (magnitudeA * magnitudeB)
    }

    const params = {
      input: [
        'The cat sat on the mat',
        'A feline rested on the rug',
        'Python is a programming language',
      ],
      model: 'text-embedding-3-small',
      encodingFormat: 'float',
      apiKey,
    }

    const url = embeddingsTool.request.url(params)
    const headers = embeddingsTool.request.headers(params)
    const body = embeddingsTool.request.body(params)

    console.log('🚀 Testing vector similarity')

    const response = await fetch(url, {
      method: embeddingsTool.request.method,
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const result = await embeddingsTool.transformResponse(response)

    const [embedding1, embedding2, embedding3] = result.output.embeddings

    // Calculate similarities
    const similarity1_2 = cosineSimilarity(embedding1, embedding2)
    const similarity1_3 = cosineSimilarity(embedding1, embedding3)

    console.log('📊 Similarity between "cat/mat" and "feline/rug":', similarity1_2.toFixed(4))
    console.log('📊 Similarity between "cat/mat" and "Python programming":', similarity1_3.toFixed(4))

    // Similar sentences should have higher similarity than dissimilar ones
    expect(similarity1_2).toBeGreaterThan(similarity1_3)
    expect(similarity1_2).toBeGreaterThan(0.8) // Similar sentences should be quite similar
    expect(similarity1_3).toBeLessThan(0.7) // Dissimilar sentences should be less similar

    console.log('✨ Similarity test passed! Similar texts have higher cosine similarity.')
  })
})
