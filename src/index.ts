import {
  Canister,
  Record,
  text,
  nat8,
  nat16,
  nat64,
  Principal,
  Opt,
  None,
  Some,
  Variant,
  StableBTreeMap,
  update,
  query,
  Result,
  ic,
  Vec,
  init,
  Err,
} from "azle";
import { v4 as uuidv4 } from "uuid";
/**
 * This represents the business owned by a user
 */
const ownerOfBusiness=Record({
  name:text,
  productsSelling:text,
  labelofProduct:text,
  price:nat64,
  ownedby:text,
  location:text,
  country:text,
  continent:text,
  zipcode:text,
  description:text,
  listedAt:nat64,
  updatedAt:Opt(nat64)
});
/**
 * this type represent business listing
 */
const businessListing=Record({
  id:text,
  business:ownerOfBusiness,
  listedBy:Principal,
  listedAt:nat64,
  updatedAt:Opt(nat64)
})
type businessListing=typeof businessListing.tsType;
/**
 * Represents payload for creating a business
 */
const BusinessPayload=Record({
  name:text,
  location:text,
  zipcode:text,
  continent:text,
  country:text,
  labelofProduct:text,
  price:nat64,
  itemName:text,
  description:text
})
     
/**
 * Represents a comment made by a buyer about a product
 */
const commentbyBuyer=Record({
  businessId:text,
  comment:text,
  rate:nat64,
  listedAt:nat64,
})
/**
 * Represents comments listing
 */
const commentListing=Record({
  id:text,
  comment:commentbyBuyer,
  listedBy:Principal,
  timeListed:nat64
})
/**
 *Represents comments payload
 */
const commentsPayload=Record({
  businessId:text,
  comment:text,
  rate:nat64
})
type commentListing=typeof commentListing.tsType;

/**
 * this type represent enquiries by buyer to seller
 * 
 */
const buyerEnquiries=Record({
  businessId:text,
  question:text,
  listedAt:nat64
})
/**
 * Represents enquiries listing
 */
const enquirelisting=Record({
  id:text,
  question:buyerEnquiries,
  listedBy:Principal,
  timeListed:nat64
})
/**
 *Represents enquiries payload
 */
 const enquiriesPayload=Record({
  businessId:text,
  question:text,
})
type enquireListing=typeof enquirelisting.tsType;
/**
 * this type represents different errors types
 */
const Error=Variant({
  NotFound:text,
  BadRequest:text,
  Forbidden:text
})
/**
 * storage variables
 */

const businessListingS=StableBTreeMap<text,businessListing>(0);
const accounts=StableBTreeMap<Principal,nat64>(0);
const soldItem=StableBTreeMap<text,Principal>(0);
const commentsOnItems=StableBTreeMap<text,commentListing>(0);
const businessEnquire=StableBTreeMap<text,enquireListing>(0)
export default Canister({
  /**
   *Create a business with given payload.
   * @param payload {BusinessPayload} Payload for creating a business
   * @returns {Result<businessListing,Error>}Result of operation
   */
  createBusiness:update([BusinessPayload],Result(businessListing,Error),(payload)=>{
    //check if there are missing values
    if(!payload.name){
      return Result.Err({BadRequest:"name of busines is missing"});
    }
    if(!payload.continent){
      return Result.Err({BadRequest:"continent where business id located is missing"});
    }
    if(!payload.country){
      return Result.Err({BadRequest:"country where business id located is missing"});
    }
    if(!payload.location){
      return Result.Err({BadRequest:"location where business id located is missing"});
    }
    if(!payload.zipcode){
      return Result.Err({BadRequest:"zipcode where business id located is missing"});
    }
    if(!payload.labelofProduct){
      return Result.Err({BadRequest:"label of product is missing"});
    }
    if(!payload.description){
      return Result.Err({BadRequest:"description of product is missing"});
    }
    if(!payload.itemName){
      return Result.Err({BadRequest:"item name of product is missing"});
    }
    if(!payload.price){
      return Result.Err({BadRequest:"price of product is missing"});
    }
    //generate business listing
    const id=uuidv4();
    const newBusinessListing:businessListing={
      id:id,
      business:{
        name:payload.name,
        productsSelling:payload.itemName,
        labelofProduct:payload.labelofProduct,
        price:payload.price,
        ownedby:payload.name,
        location:payload.location,
        country:payload.country,
        continent:payload.continent,
        zipcode:payload.zipcode,
        description:payload.description,
        listedAt:ic.time(),
        updatedAt:None
      },
      listedBy:ic.caller(),
      listedAt:ic.time(),
      updatedAt:None,
    };
    businessListingS.insert(newBusinessListing.id,newBusinessListing);
    return Result.Ok(newBusinessListing);
  }),

  /**
   * get a specific business by id
   *  @params {text} id-Business id
   * @returns {Result<businessListing,Error>}-Result of operation
   
   */
  getSpecificBusiness:query([text],Result(businessListing,Error),(businessId)=>{
    if(!businessId){
      return Result.Err({BadRequest:"name of business is missing"});
    }
    const getItem=businessListingS.get(businessId);
    if(getItem.None){
      return Result.Err({BadRequest:"no business with that id if found"});
    }
    return Result.Ok(businessListingS.get(businessId).Some!);
  }),
  /**
   * allow seller to delete their business
   * @params {text} business id of an business you want to be deleted
   * @returns {Result<businessListing,Error>}-REsult of the operation
   */
  sellerDeleteBusiness:update([text],Result(businessListing,Error),(itemId)=>{
    
    if(!itemId){
      return Result.Err({BadRequest:"item id is missing"});
    }
    //make sure that its only owner can delete the item 
  
   const removeItem=businessListingS.get(itemId).Some!;
   if(!removeItem){
    return Result.Err({BadRequest:`item with give id not found`});
   }
   if(removeItem.listedBy.toText()!=ic.caller().toText()){
     return Result.Err({Forbidden:"only seller can delete the product"}) 
  }
    businessListingS.remove(itemId);
    return Result.Ok(removeItem)
  }),
/**
 *this is where the user search for a specific business to ask info about their products that they are actaully offering
 *@params pass businessid and questions
 *@returns ireturn either an error or success message
 */
 getinfoAboutAbusiness:update([enquiriesPayload],Result(enquirelisting,Error),(payload)=>{
  //check if one has passes the business id
  if(!payload.businessId){
    return Result.Err({BadRequest:"business id is requires"});
  }
  if(!payload.question){
    return Result.Err({BadRequest:"b is requires"});
  }
  //check if business actually exist
  const getBusiness=businessListingS.get(payload.businessId);
    if(getBusiness.None){
      return Result.Err({BadRequest:"no business with that id found"});
    }
    //if business is found enquire
    const id=uuidv4();
      const enquireListing:enquireListing={
        id:id,
        question:{
        
          businessId:payload.businessId,
          question:payload.question,
          listedAt:ic.time()
        },
        listedBy:ic.caller(),
        timeListed:ic.time()
      }
      businessEnquire.insert(enquireListing.id,enquireListing);
      return Result.Ok(enquireListing);
 }),

  /**
   * this is where the user can comment about the product he/she bought from seller or the services that sseller is offering
   * @params seller business id and a  comment
   * @returns parameters passed and error if any
   */
    buyerComments:update([commentsPayload],Result(commentListing,Error),(payload)=>{
      //check to make sure every field is filled with correct value
      if(!payload.businessId){
        return Result.Err({BadRequest:"item id is missing"});
      }
      if(!payload.comment){
        return Result.Err({BadRequest:"comment is missing"});
      }
      if(!payload.rate){
        return Result.Err({BadRequest:"rate is missing"});
      }
      //check if item has been sold
      // const buyerid=soldItem.values()
      // check if its the buyer who actuallly bought the item
      // if(ic.caller().toText()!=getItem.)
      const id=uuidv4();
      const commentListing:commentListing={
        id:id,
        comment:{
        
          businessId:payload.businessId,
          comment:payload.comment,
          rate:payload.rate,
          listedAt:ic.time()
        },
        listedBy:ic.caller(),
        timeListed:ic.time()
      }
      commentsOnItems.insert(commentListing.id,commentListing);
      return Result.Ok(commentListing);
    })
    
});
function getBalance(accountOPT:Opt<nat64>):nat64{
  if('None' in accountOPT){
    return 0n;
  }
  else{
    return accountOPT.Some;
  }
}