const Joi = require('joi');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dto/user');
const JWTService = require('../services/JWTService');
const RefreshToken = require('../models/token');
const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z\d]{8,25}$/;




const newController = {
    async register(req, res, next) {
        const userRegisterScheme = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            name:Joi.string().max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().pattern(passwordPattern).required(),
            confirmPassword: Joi.ref('password')
        });

        const {error} = userRegisterScheme.validate(req.body);
        
        if(error){
            return next(error);
        }

        const {username,name,email,password} = req.body;

        try{
            const emailInUse = await User.exists({email});
            const usernameInUse = await User.exists({username});
             
            if(emailInUse)
            {
                const error = {
                    status: 409,
                    message: 'This email already registered, use new email'
                }

                return next(error);
            }

            if(usernameInUse)
            {
                const error = {
                    status: 409,
                    message: 'This username not available'
                }

                return next(error);
            }

        }

        catch(error) {
            return next(error);
        }

         const hashedPassword = await bcrypt.hash(password,10);

          let accessToken;
          let refreshToken;
          let user;

          try{
            const userToRegister = new User({

                username:username,
                email:email,
                name:name,
                password:hashedPassword
    
             });

            user = await userToRegister.save();

            const payload = { _id: user._id, username: user.username }; 
            const accessToken = JWTService.signAccessToken(payload, '30m');
            const refreshToken = JWTService.signRefreshToken(payload, '60m');
             
          }


          catch(error){
        return next(error);
          }

         await JWTService.signRefreshToken(refreshToken,user._id);

          res.cookie('accessToken',accessToken,{
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly:true

          });

          res.cookie('refreshToken',refreshToken,{
            maxAge: 1000* 60 * 60 * 24,
            httpOnly:true
          });

         

         const userDto = new UserDTO(user);


         return res.status(201).json({user:userDto, auth:true});

    },
    async login(req,res,next) {
        const userLoginSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            password: Joi.string().pattern(passwordPattern)
        });

        const {error} = userLoginSchema.validate(req.body);

        if(error)
        {
            return next(error);
        }

        const {username, password} = req.body;
        
        
     let user;

        try{
            user =await User.findOne({username:username});
            if(!user){
                const error = {
                    status:401,
                    message:'Invalid username'
                }

                return next(error);
            }

            const match = await bcrypt.compare(password, user.password);
             
            if(!match)
            {
                const error = {
                    status: 401,
                    message:'Invalid password'
                }
                return next(error);
            }

        }

        catch(error)
        {
            return next(error);
        }

        const payload = { _id: user._id, username: user.username };
        const accessToken = JWTService.signAccessToken(payload, '30m');
        const refreshToken = JWTService.signRefreshToken(payload, '60m');
          try{
            await RefreshToken.updateOne({
                _id: user._id
            },
            {token:refreshToken},
            {upsert:true}
            )
          } 

          catch(error)
          {
            return next(error);
          }
        res.cookie('accessToken',accessToken,{
            maxAge:1000 * 60 * 60 *24,
            httpOnly: true
        });
         
        res.cookie('refreshToken',refreshToken,{
            maxAge: 1000 *60 *60 *24,
            httpOnly:true
        });

        const userDto = new UserDTO(user);

        return res.status(200).json({user:userDto, auth:true});
        
    },

    async logout(req,res,next)
    {
        console.log(req);
        const {refreshToken} = req.cookies;

        try{
           await RefreshToken.deleteOne({token:refreshToken});
        } catch (error)
        {
            return next(error);
        }

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.status(200).json({user:null, auth:false});


    },

    async refresh(req,res,next)
    {
        const originalRefreshToken = req.cookies.refreshToken;

        let id;

        try{
            id = JWTService.verifyRefreshToken(originalRefreshToken)._id;
        }
        catch(e)
        {
            const error = {
                staus:401,
                message:'Unauthorized'
            }

            return next(error);
        }

        try{
            const match = RefreshToken.findOne({_id:id , token:originalRefreshToken});
            if(!match){
                const error = {
                    status:401,
                    message:'Unauthorized'
                }

                return next(error);
            }
        }
        
        catch(e)
        {
            return next(e);
        }

        try{
            const payload = { _id: user._id, username: user.username };
            const accessToken = JWTService.signAccessToken(payload, '30m');
            const refreshToken = JWTService.signRefreshToken(payload, '60m');
            await RefreshToken.updateOne({_id:id},{token:refreshToken});
           res.cookie('accessToken',accessToken,{
            maxAge:1000*60*60*24,
            httpOnly:true
           })

           res.cookie('refreshToken',refreshToken,{
            maxAge:1000*60*60*24,
            httpOnly:true
           });

        }

        catch(e)
        {
            return next(e);
        }

        const user = await User.findOne({_id:id});
        const userDto = new UserDTO(user);
        return res.status(200).json({user:userDto , auth:true});

    }

    
    


}

module.exports = newController;