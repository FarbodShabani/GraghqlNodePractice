const {buildSchema} = require("graphql");



module.exports = buildSchema(`

   type Post {
      _id: ID!
      title: String!
      content: String!
      imageUrl: String!
      creator: User!
      createdAt: String!
      updatedAt: String!
   }

   type User{
      _id: ID!
      name: String!
      email: String!
      password: String!
      status: String!
      posts: [Post!]!
   }

   type AuthData {
      userId: String!
      token: String!
   }

   type PostsData {
      posts: [Post!]!
      totalItems: Int!
   }

   input UserInputData {
      name: String!
      email: String!
      password: String!
   }

   input LoginInputData {
      email: String!
      password: String!
   }

   input PostInputData {
      title: String!
      content: String!
      imageUrl: String
   }

   type RootMutation {
      createUser(userInput: UserInputData) : User!
      createPost(postInput: PostInputData) : Post!
      updatePost(postId: ID!, postInput: PostInputData) : Post!
      deletePost(postId: ID!) : String!
      updateStatus(status: String! ) : Boolean!
   }  

   type RootQuery {
      login(loginInput: LoginInputData) : AuthData! 
      getPosts(currentPage: Int) : PostsData!
      getPost(postId : ID!): Post!
      user: User!
   }

   schema {
    mutation: RootMutation
    query: RootQuery
   }


`);