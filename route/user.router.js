const express = require("express");
const { register, login, logout,getCurrentUser, checkToken, updateProfile } = require('../controllers/user.controller');
const { userAuth } = require("../middleware/auth");

const router=express.Router();

router.post('/user/register',register);
router.post('/user/login',login)
router.get('/user/logout',userAuth,logout)
router.get('/user/profile',userAuth,getCurrentUser)
router.get('/check-user',checkToken)
router.patch('/user/profile',userAuth,updateProfile)
module.exports=router